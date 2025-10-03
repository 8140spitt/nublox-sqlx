export interface Capabilities {
    dialect: 'mysql' | 'postgres' | 'mssql' | 'oracle' | 'sqlite';
    version: string;
    features: {
        explainJson: boolean;
        checkConstraints: boolean;
        invisibleIndex: boolean;
        instantAddColumn: boolean;
        onlineIndexCreate: boolean;
    };
}
