# Database Configuration Guide

This project supports two database backends that can be switched via environment configuration:

1. **Local PostgreSQL** - For development
2. **Supabase** - For production deployments

## Quick Start

### Local Development (PostgreSQL)

1. **Install and start PostgreSQL**:
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16

   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql

   # Docker
   docker run --name amis-postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:16
   ```

2. **Create a database**:
   ```bash
   createdb amis_bot
   # Or with docker:
   docker exec -it amis-postgres createdb -U postgres amis_bot
   ```

3. **Initialize the schema**:
   ```bash
   psql amis_bot < bot/utils/database-schema.sql
   # Or with docker:
   docker exec -i amis-postgres psql -U postgres amis_bot < bot/utils/database-schema.sql
   ```

4. **Configure environment variables**:
   ```bash
   # .env file
   USE_LOCAL_PG=true
   DATABASE_URL=postgresql://username:password@localhost:5432/amis_bot
   # DATABASE_SSL=false (default for local)
   ```

### Production (Supabase)

1. **Set up Supabase project**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `bot/utils/database-schema.sql` in the Supabase SQL editor
   - Get your project URL and anon key from Project Settings > API

2. **Configure environment variables**:
   ```bash
   # .env file or hosting platform environment variables
   USE_LOCAL_PG=false
   # Or just set NODE_ENV=production (defaults to Supabase)
   
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Environment Variable Reference

### Database Backend Selection

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `USE_LOCAL_PG` | `true` / `false` | Based on `NODE_ENV` | Explicitly control which database backend to use |
| `NODE_ENV` | `development` / `production` | `development` | When `USE_LOCAL_PG` is not set, uses local PG in development, Supabase in production |

### Local PostgreSQL Configuration

| Variable | Required When | Description |
|----------|---------------|-------------|
| `DATABASE_URL` | `USE_LOCAL_PG=true` | PostgreSQL connection string (can use `CONNECTION_STRING` instead) |
| `CONNECTION_STRING` | `USE_LOCAL_PG=true` | Alternative to `DATABASE_URL` |
| `DATABASE_SSL` | Optional | Set to `"true"` if SSL is required for PostgreSQL connection |

**Connection String Format**:
```
postgresql://username:password@host:port/database
```

**Examples**:
- Local: `postgresql://postgres:password@localhost:5432/amis_bot`
- Docker: `postgresql://postgres:password@localhost:5432/amis_bot`
- Remote: `postgresql://user:pass@remote-host.com:5432/amis_bot`

### Supabase Configuration

| Variable | Required When | Description |
|----------|---------------|-------------|
| `SUPABASE_URL` | `USE_LOCAL_PG=false` or `NODE_ENV=production` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | `USE_LOCAL_PG=false` or `NODE_ENV=production` | Your Supabase anonymous key |

## Database Schema

The schema includes two main tables:

### `trades`
Stores trade information and metadata:
- `trade_id` - Unique trade identifier
- `guild_id`, `channel_id`, `message_id` - Discord message location
- `buyer_id`, `seller_id` - Discord user IDs
- `buyer_display`, `seller_display` - Display names
- `buyer_confirmed`, `seller_confirmed` - Confirmation status
- `item`, `price`, `additional_details` - Trade details
- `created_at`, `updated_at` - Timestamps

### `wallet_connections`
Stores wallet addresses connected to trades:
- `trade_id` - Associated trade
- `discord_user_id` - Discord user ID
- `wallet_address` - Connected Ethereum wallet address
- Unique constraint on `(trade_id, discord_user_id)`

## Switching Between Backends

The database abstraction layer (`bot/utils/database.js`) provides a unified API that works with both backends:

```javascript
import { getDatabase } from './database.js';

const db = getDatabase();

// Query syntax is identical regardless of backend
const { data, error } = await db
  .from('trades')
  .select('*')
  .eq('trade_id', tradeId)
  .single();
```

The abstraction automatically:
- Detects which backend to use based on environment variables
- Mimics Supabase's query builder API for PostgreSQL
- Handles placeholder numbering in SQL queries
- Provides connection pooling for PostgreSQL

## Testing Database Connection

You can test your database connection using the included health check:

```javascript
import { testDatabaseConnection } from './bot/utils/database.js';

const isConnected = await testDatabaseConnection();
console.log('Database connected:', isConnected);
```

## Troubleshooting

### Common Issues

**"Database connection string not configured"**
- Ensure either `DATABASE_URL` or `CONNECTION_STRING` is set when using local PostgreSQL
- Check that the environment variable is properly loaded (not empty string)

**"Supabase environment variables not configured"**
- Ensure both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set when using Supabase
- Verify the values are correct in your `.env` file

**"relation does not exist" errors**
- The database schema hasn't been initialized
- Run the schema SQL file: `psql yourdb < bot/utils/database-schema.sql`

**Connection refused / timeout**
- Check that PostgreSQL is running: `psql -l`
- Verify the host and port in your connection string
- Check firewall settings if connecting to remote database

**SSL connection issues**
- Some PostgreSQL hosts require SSL: set `DATABASE_SSL=true`
- For self-signed certificates, the code uses `rejectUnauthorized: false`

## Migration from Supabase to Local PostgreSQL

1. Export your Supabase data:
   ```sql
   -- In Supabase SQL editor
   COPY trades TO STDOUT WITH CSV HEADER;
   COPY wallet_connections TO STDOUT WITH CSV HEADER;
   ```

2. Import into local PostgreSQL:
   ```bash
   psql amis_bot < bot/utils/database-schema.sql
   psql amis_bot -c "COPY trades FROM STDIN WITH CSV HEADER" < trades.csv
   psql amis_bot -c "COPY wallet_connections FROM STDIN WITH CSV HEADER" < wallet_connections.csv
   ```

3. Update `.env`:
   ```bash
   USE_LOCAL_PG=true
   DATABASE_URL=postgresql://localhost/amis_bot
   ```

## Best Practices

1. **Development**: Use local PostgreSQL for faster development and offline work
2. **Production**: Use Supabase for managed hosting, automatic backups, and real-time features
3. **Testing**: Create separate databases for testing to avoid data contamination
4. **Backups**: Regularly backup your production database
5. **Connection Pooling**: The PostgreSQL adapter uses connection pooling automatically

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
