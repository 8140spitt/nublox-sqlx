export type Isolation = 'read committed' | 'repeatable read' | 'serializable' | 'read uncommitted';
export type BeginIR = { kind: 'begin'; isolation?: Isolation };
export type CommitIR = { kind: 'commit' };
export type RollbackIR = { kind: 'rollback'; toSavepoint?: string };
export type SavepointIR = { kind: 'savepoint'; name: string };
export type ReleaseIR = { kind: 'release'; name: string };
export type TclIR = BeginIR | CommitIR | RollbackIR | SavepointIR | ReleaseIR;
