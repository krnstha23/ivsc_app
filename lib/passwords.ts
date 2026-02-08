import bcrypt from "bcryptjs";

const SALT_ROUNDS = 20;

/**
 * Hash a plain text password for storage.
 * Uses bcrypt with 20 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a stored hash.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
