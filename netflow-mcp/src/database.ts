import duckdb from 'duckdb'

export class Database {
  private db: duckdb.Database
  private connection: duckdb.Connection

  constructor(path = ':memory:') {
    this.db = new duckdb.Database(path)
    this.connection = this.db.connect()
  }

  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.connection.all(sql, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result as T[])
        }
      })
    })
  }

  async loadParquet(filePath: string, tableName: string): Promise<void> {
    const sql = `CREATE TABLE ${tableName} AS SELECT * FROM read_parquet('${filePath}')`
    return new Promise((resolve, reject) => {
      this.connection.run(sql, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async getSchema(tableName: string): Promise<string[]> {
    const result = await this.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`
    )
    return result.map((r) => r.column_name)
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.connection.close(() => {
        this.db.close(() => {
          resolve()
        })
      })
    })
  }
}

// Convenience functions for singleton usage
let defaultDb: Database | null = null

export function loadParquet(filePath: string, tableName: string): Promise<void> {
  if (!defaultDb) {
    defaultDb = new Database()
  }
  return defaultDb.loadParquet(filePath, tableName)
}

export function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  if (!defaultDb) {
    defaultDb = new Database()
  }
  return defaultDb.query<T>(sql)
}

export async function close(): Promise<void> {
  if (defaultDb) {
    await defaultDb.close()
    defaultDb = null
  }
}
