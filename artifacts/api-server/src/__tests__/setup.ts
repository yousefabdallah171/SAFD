// Set env vars before any workspace package is imported
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://safd_test:safd_test_pwd@localhost:5433/safd_test";

process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || "test-secret-key-for-unit-tests-only";

process.env.NODE_ENV = "test";
