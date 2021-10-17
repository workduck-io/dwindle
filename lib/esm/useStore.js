import create from 'zustand';
export var useStore = create(function (set) { return ({
    n: 'something',
    setN: function (n) { return set({ n: n }); },
}); });
export var useMyHook = function () {
    var n = useStore(function (store) { return store.n; });
    var setN = useStore(function (store) { return store.setN; });
    return { n: n, setN: setN };
};
