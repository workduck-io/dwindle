interface Simple {
    n: string;
    setN: (n: string) => void;
}
export declare const useStore: import("zustand").UseStore<Simple>;
export declare const useMyHook: () => {
    n: string;
    setN: (n: string) => void;
};
export {};
