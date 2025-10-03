export type Priv = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'REFERENCES' | 'USAGE' | 'CREATE' | 'ALTER' | 'DROP' | 'EXECUTE' | 'ALL';
export type ObjectScope = '*' | { schema: string; name?: string };

export type CreateUserIR = { kind: 'createUser'; name: string; password?: string; requireSsl?: boolean };
export type AlterUserIR = { kind: 'alterUser'; name: string; password?: string; lock?: boolean };
export type GrantIR = { kind: 'grant'; privileges: Priv[]; on: ObjectScope; to: string; withGrantOption?: boolean };
export type RevokeIR = { kind: 'revoke'; privileges: Priv[]; on: ObjectScope; from: string };
export type DclIR = CreateUserIR | AlterUserIR | GrantIR | RevokeIR;
