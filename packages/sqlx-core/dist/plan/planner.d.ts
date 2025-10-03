import type { CIR_Snapshot } from '../ir/cir';
import type { ChangeSet } from '../ir/change-set';
export declare function diffSnapshots(a: CIR_Snapshot, b: CIR_Snapshot): ChangeSet;
