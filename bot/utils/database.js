/**
 * Database abstraction layer
 *
 * Provides a unified interface that can switch between:
 * - Local PostgreSQL via the `pg` package (development)
 * - Supabase via `@supabase/supabase-js` (production)
 *
 * The adapter mimics the subset of the Supabase query builder API used by the bot,
 * so the rest of the codebase can continue to issue `.from().select().eq()` style
 * queries without knowing which backend is in use.
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

import { env, shouldUseLocalPg } from '../config/env.js';

import { logger } from './logger.js';

let supabaseClient = null;
let pgPool = null;
let cachedDatabase = null;

function getPgPool() {
  if (pgPool) {
    return pgPool;
  }

  const connectionString =
    env.CONNECTION_STRING ||
    env.DATABASE_URL ||
    process.env.CONNECTION_STRING ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL/CONNECTION_STRING is required when USE_LOCAL_PG=true',
    );
  }

  const sslEnabled =
    typeof env.DATABASE_SSL === 'string'
      ? env.DATABASE_SSL.toLowerCase() === 'true'
      : false;

  pgPool = new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });

  logger.info('Initialized PostgreSQL connection pool');
  return pgPool;
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured');
  }

  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  logger.info('Initialized Supabase client');
  return supabaseClient;
}

class PostgresQueryBuilder {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
    this.operation = 'select';
    this.selectColumns = '*';
    this.returningColumns = '*';
    this.whereConditions = [];
    this.updateData = null;
    this.upsertData = null;
    this.upsertConflict = null;
    this.orderByClause = null;
    this.limitValue = null;
    this.shouldReturnSingle = false;
  }

  select(columns = '*') {
    if (this.operation === 'update') {
      this.returningColumns = columns;
      return this;
    }

    this.operation = 'select';
    this.selectColumns = columns;
    return this;
  }

  eq(field, value) {
    this.whereConditions.push({ field, operator: '=', value });
    return this;
  }

  neq(field, value) {
    this.whereConditions.push({ field, operator: '!=', value });
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  upsert(data, options = {}) {
    this.operation = 'upsert';
    this.upsertData = data;
    this.upsertConflict = options.onConflict || null;
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.orderByClause = `ORDER BY ${field} ${direction.toUpperCase()}`;
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  single() {
    this.shouldReturnSingle = true;
    return this;
  }

  async execute() {
    try {
      switch (this.operation) {
        case 'update':
          return this._executeUpdate();
        case 'upsert':
          return this._executeUpsert();
        default:
          return this._executeSelect();
      }
    } catch (error) {
      logger.error('PostgreSQL query error', {
        table: this.tableName,
        error: error.message,
      });
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  _buildWhereClause(startIndex = 1) {
    if (!this.whereConditions.length) {
      return { clause: '', values: [] };
    }

    const clauses = this.whereConditions.map((condition, idx) => {
      const placeholder = `${String.fromCharCode(36)}${startIndex + idx}`;
      return `${condition.field} ${condition.operator} ${placeholder}`;
    });

    const values = this.whereConditions.map((condition) => condition.value);

    return { clause: `WHERE ${clauses.join(' AND ')}`, values };
  }

  _formatResult(result) {
    if (this.shouldReturnSingle) {
      if (!result.rows.length) {
        return { data: null, error: new Error('No rows returned') };
      }
      return { data: result.rows[0], error: null };
    }

    return { data: result.rows, error: null };
  }

  async _executeSelect() {
    let query = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
    let values = [];

    if (this.whereConditions.length) {
      const { clause, values: whereValues } = this._buildWhereClause();
      query += ` ${clause}`;
      values = whereValues;
    }

    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }

    if (this.limitValue) {
      query += ` LIMIT ${this.limitValue}`;
    }

    logger.debug('Executing PostgreSQL SELECT', { query, values });
    const result = await this.pool.query(query, values);
    return this._formatResult(result);
  }

  async _executeUpdate() {
    if (!this.updateData || !Object.keys(this.updateData).length) {
      throw new Error('No update payload provided');
    }

    const keys = Object.keys(this.updateData);
    const setClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
    const setValues = keys.map((key) => this.updateData[key]);

    let query = `UPDATE ${this.tableName} SET ${setClauses.join(', ')}`;
    let values = [...setValues];

    if (this.whereConditions.length) {
      const where = this._buildWhereClause(setValues.length + 1);
      query += ` ${where.clause}`;
      values = [...setValues, ...where.values];
    }

    query += ` RETURNING ${this.returningColumns}`;

    logger.debug('Executing PostgreSQL UPDATE', { query, values });
    const result = await this.pool.query(query, values);
    return this._formatResult(result);
  }

  async _executeUpsert() {
    if (!this.upsertData || !Object.keys(this.upsertData).length) {
      throw new Error('No upsert payload provided');
    }

    const keys = Object.keys(this.upsertData);
    const columns = keys.join(', ');
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const values = keys.map((key) => this.upsertData[key]);

    let query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    if (this.upsertConflict) {
      const conflictColumns = this.upsertConflict.split(',').map((col) => col.trim());
      const updateAssignments = keys
        .filter((key) => !conflictColumns.includes(key))
        .map((key) => `${key} = EXCLUDED.${key}`)
        .join(', ');

      if (updateAssignments.length) {
        query += ` ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateAssignments}`;
      } else {
        query += ` ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`;
      }
    }

    logger.debug('Executing PostgreSQL UPSERT', { query, values });
    const result = await this.pool.query(query, values);
    return { data: result.rows, error: null };
  }
}

class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  from(tableName) {
    return new PostgresQueryBuilder(this.pool, tableName);
  }
}

export function getDatabase() {
  if (cachedDatabase) {
    return cachedDatabase;
  }

  if (shouldUseLocalPg()) {
    logger.info('Using local PostgreSQL database');
    cachedDatabase = new PostgresAdapter(getPgPool());
  } else {
    logger.info('Using Supabase database');
    cachedDatabase = getSupabaseClient();
  }

  return cachedDatabase;
}

export async function closeDatabaseConnections() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }

  cachedDatabase = null;
}

export async function testDatabaseConnection() {
  try {
    if (shouldUseLocalPg()) {
      const pool = getPgPool();
      await pool.query('SELECT 1');
      logger.info('PostgreSQL connection successful');
      return true;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('trades').select('trade_id').limit(1);

    if (error) {
      throw error;
    }

    logger.info('Supabase connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', error.message || error);
    return false;
  }
}
