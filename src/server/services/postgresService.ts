import pg from 'pg';

export interface PostgresConnectionParams {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface PostgresConnectionResult {
  success: boolean;
  database: string;
  host: string;
  port: number;
  user: string;
  version?: string;
  tableCount: number;
  tables: string[];
  message: string;
}

/**
 * Tests direct connection to a PostgreSQL / Supabase database.
 * Supports both connection URI and individual connection parameters.
 */
export async function testPostgresConnection(
  params: PostgresConnectionParams
): Promise<PostgresConnectionResult> {
  let connectionString = (params.connectionString || '').trim();

  // 1. Check for common user mistakes in Supabase URI template
  if (connectionString) {
    if (
      connectionString.includes('[YOUR-PASSWORD]') ||
      connectionString.includes('[YOUR-PROJECT-REF]') ||
      connectionString.includes('[password]') ||
      connectionString.includes('[project-ref]') ||
      connectionString.includes('[REGION]')
    ) {
      throw new Error(
        'Chuỗi kết nối vẫn còn chứa ký hiệu mẫu [YOUR-PASSWORD] hoặc [YOUR-PROJECT-REF]. Vui lòng thay thế bằng mật khẩu database thật của bạn (lúc tạo project trên Supabase)!'
      );
    }
  } else if (params.host) {
    const user = encodeURIComponent(params.user || 'postgres');
    const pass = params.password ? `:${encodeURIComponent(params.password)}` : '';
    const host = params.host.trim();
    const port = Number(params.port) || 5432;
    const db = (params.database || 'postgres').trim();
    connectionString = `postgresql://${user}${pass}@${host}:${port}/${db}`;
  }

  if (!connectionString) {
    throw new Error('Vui lòng nhập Chuỗi kết nối PostgreSQL (Connection URI) hoặc các tham số chi tiết.');
  }

  // Normalize protocol if needed
  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    connectionString = `postgresql://${connectionString}`;
  }

  // Detect Supabase or remote cloud host
  const isSupabase =
    connectionString.includes('supabase.co') ||
    connectionString.includes('supabase.com') ||
    connectionString.includes('pooler.supabase.com');

  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  // Parse connection details for reporting
  let parsedHost = params.host || 'postgres-server';
  let parsedPort = params.port || 5432;
  let parsedDb = params.database || 'postgres';
  let parsedUser = params.user || 'postgres';

  try {
    const urlObj = new URL(connectionString);
    parsedHost = urlObj.hostname || parsedHost;
    parsedPort = urlObj.port ? Number(urlObj.port) : (isSupabase ? 6543 : 5432);
    parsedDb = urlObj.pathname ? urlObj.pathname.replace(/^\//, '') : parsedDb;
    parsedUser = urlObj.username ? decodeURIComponent(urlObj.username) : parsedUser;
  } catch {
    // fallback
  }

  // Supabase transaction pooler on port 6543 or direct port 5432 requires SSL
  const useSsl = params.ssl || isSupabase || !isLocal;

  const client = new pg.Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 9000,
  });

  try {
    await client.connect();

    // Query server identity
    const idRes = await client.query('SELECT current_database(), current_user, version()');
    const actualDb = idRes.rows[0]?.current_database || parsedDb;
    const actualUser = idRes.rows[0]?.current_user || parsedUser;
    const versionStr = idRes.rows[0]?.version || '';

    // Query all existing tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames: string[] = tablesRes.rows.map((r: any) => String(r.table_name));
    const tableCount = tableNames.length;

    let message = '';
    if (tableCount === 0) {
      message = `Đã xác thực và kết nối thành công tới ${isSupabase ? 'Supabase Cloud' : 'PostgreSQL'} (${actualDb})! Hiện tại cơ sở dữ liệu chưa có bảng nào. Hãy bấm nút "Chép SQL 30 bảng" và dán vào Supabase SQL Editor > Run để hoàn tất khởi tạo.`;
    } else {
      message = `Kết nối thành công tới ${isSupabase ? 'Supabase Cloud' : 'PostgreSQL'} (${actualDb} / người dùng: ${actualUser})! Đã phát hiện ${tableCount} bảng dữ liệu trong schema public.`;
    }

    return {
      success: true,
      database: actualDb,
      host: parsedHost,
      port: parsedPort,
      user: actualUser,
      version: versionStr,
      tableCount,
      tables: tableNames,
      message,
    };
  } catch (err: any) {
    const errorMsg = String(err?.message || err || '');

    if (errorMsg.includes('password authentication failed')) {
      throw new Error(
        `Xác thực mật khẩu thất bại cho tài khoản "${parsedUser}". Hãy chắc chắn bạn đã thay [YOUR-PASSWORD] bằng mật khẩu database Supabase (Project Settings > Database > Database password).`
      );
    } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
      throw new Error(
        `Không thể tìm thấy địa chỉ máy chủ "${parsedHost}". Hãy kiểm tra lại Project Ref và Region của Supabase (ví dụ: aws-0-ap-southeast-1.pooler.supabase.com).`
      );
    } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      throw new Error(
        `Kết nối tới ${parsedHost}:${parsedPort} bị quá thời gian chờ (Timeout). Hãy sử dụng Supabase Pooler (cổng 6543) nếu kết nối từ mạng IPv4 hoặc Serverless.`
      );
    } else if (errorMsg.includes('Tenant or user not found')) {
      throw new Error(
        `Không tìm thấy Project Supabase. Đối với cổng 6543 (Pooler), tên người dùng phải có định dạng postgres.[project-ref].`
      );
    }

    throw new Error(`Lỗi kết nối PostgreSQL/Supabase: ${errorMsg}`);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore client end error
    }
  }
}
