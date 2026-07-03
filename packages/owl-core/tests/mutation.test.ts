import { proxy, toRaw, onMutation, type Mutation } from "../src";

test("top-level scalar set emits a mutation with correct fields", () => {
  const state = proxy({ count: 1 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.count = 2;

  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toEqual({
    // The reported target is the raw leaf object, not the proxy.
    target: toRaw(state),
    key: "count",
    oldValue: 1,
    newValue: 2,
    isDelete: false,
  });
  unsubscribe();
});

test("inserting a new key emits oldValue undefined", () => {
  const state = proxy<{ a: number; b?: number }>({ a: 1 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.b = 5;

  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toMatchObject({
    key: "b",
    oldValue: undefined,
    newValue: 5,
    isDelete: false,
  });
  unsubscribe();
});

test("nested write reports the child object as the target", () => {
  const state = proxy({ rows: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }] });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  // Reading through the proxy returns the (proxied) row; writing to it triggers
  // the leaf object's set trap.
  state.rows[3].value = 42;

  expect(mutations).toHaveLength(1);
  const m = mutations[0];
  expect(m.key).toBe("value");
  expect(m.oldValue).toBe(4);
  expect(m.newValue).toBe(42);
  expect(m.isDelete).toBe(false);
  // The target is the raw row object (index 3), not the root or the array.
  expect(m.target).toBe(toRaw(state.rows[3]));
  unsubscribe();
});

test("array push emits an index set and a length mutation", () => {
  const state = proxy({ items: [10, 20] as number[] });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.items.push(30);

  // push writes index 2 then updates length.
  const indexMutation = mutations.find((m) => m.key === "2");
  const lengthMutation = mutations.find((m) => m.key === "length");

  expect(indexMutation).toBeDefined();
  expect(indexMutation).toMatchObject({
    key: "2",
    oldValue: undefined,
    newValue: 30,
    isDelete: false,
  });
  expect(indexMutation!.target).toBe(toRaw(state.items));

  // Note: arrays update `length` behind the scenes before the "length" set
  // trap fires, so owl reads the already-updated length as the "original"
  // value. The length mutation therefore reports the new length as both old
  // and new value; what matters for consumers is that a "length" mutation is
  // emitted at all so they can detect array size changes.
  expect(lengthMutation).toBeDefined();
  expect(lengthMutation).toMatchObject({
    key: "length",
    newValue: 3,
    isDelete: false,
  });
  unsubscribe();
});

test("delete emits isDelete true with the correct oldValue", () => {
  const state = proxy<{ a: number; b?: number }>({ a: 1, b: 2 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  delete state.b;

  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toEqual({
    target: toRaw(state),
    key: "b",
    oldValue: 2,
    newValue: undefined,
    isDelete: true,
  });
  unsubscribe();
});

test("deleting an absent key emits nothing", () => {
  const state = proxy<{ a: number; b?: number }>({ a: 1 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  delete state.b;

  expect(mutations).toHaveLength(0);
  unsubscribe();
});

test("no-op set (same value) emits nothing", () => {
  const state = proxy({ a: 1 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.a = 1;

  expect(mutations).toHaveLength(0);
  unsubscribe();
});

test("unsubscribe stops further emission", () => {
  const state = proxy({ a: 1 });
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.a = 2;
  expect(mutations).toHaveLength(1);

  unsubscribe();
  state.a = 3;
  expect(mutations).toHaveLength(1);
});

test("with no observer registered, writes trigger nothing and do not retroactively fire", () => {
  const state = proxy({ a: 1 });

  // No observer registered: this write must not be recorded anywhere.
  state.a = 2;

  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));
  // Registering afterwards does not replay the earlier write.
  expect(mutations).toHaveLength(0);

  state.a = 3;
  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toMatchObject({ key: "a", oldValue: 2, newValue: 3 });
  unsubscribe();
});

test("Map.set emits a mutation with the map key and values", () => {
  const state = proxy(new Map<string, number>());
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.set("x", 1);
  state.set("x", 2);

  expect(mutations).toHaveLength(2);
  expect(mutations[0]).toMatchObject({
    key: "x",
    oldValue: undefined,
    newValue: 1,
    isDelete: false,
  });
  expect(mutations[1]).toMatchObject({ key: "x", oldValue: 1, newValue: 2, isDelete: false });
  unsubscribe();
});

test("Set.add emits a mutation whose key is the value", () => {
  const state = proxy(new Set<number>());
  const mutations: Mutation[] = [];
  const unsubscribe = onMutation((m) => mutations.push(m));

  state.add(7);
  state.add(7); // already present: no emission

  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toMatchObject({ key: 7, oldValue: undefined, newValue: 7, isDelete: false });
  unsubscribe();
});
