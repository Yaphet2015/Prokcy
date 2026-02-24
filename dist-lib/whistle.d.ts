declare global {
    namespace NodeJS {
        interface Process {
            handleUncauthtWhistleErrorMessage?: (stack: string, err: Error) => void;
        }
    }
}
export {};
//# sourceMappingURL=whistle.d.ts.map