# Fix: "column passwordhash does not exist"

PostgreSQL folds unquoted column names to lowercase. The Prisma migration created the column as **`"passwordHash"`** (case-sensitive). Use double quotes around the column name in raw SQL:

```sql
UPDATE users
SET "passwordHash" = '$2b$10$FaH9QMLQoALDp4LZ4UiZVO/0.rZb1km13f2HtfMHWdvG6VGUQkgO6'
WHERE username = 'pus.pandey';
```

If your client lowercases `username` and the update still fails, quote it too:

```sql
UPDATE "users"
SET "passwordHash" = '$2b$10$FaH9QMLQoALDp4LZ4UiZVO/0.rZb1km13f2HtfMHWdvG6VGUQkgO6'
WHERE "username" = 'pus.pandey';
```
