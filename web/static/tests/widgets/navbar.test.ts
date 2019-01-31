import { Env } from "../../src/ts/env";
import { Navbar, Props } from "../../src/ts/widgets/navbar";
import { makeTestEnv, makeTestFixture } from "../helpers";

//------------------------------------------------------------------------------
// Setup and helpers
//------------------------------------------------------------------------------

let fixture: HTMLElement;
let env: Env;
let props: Props;

beforeEach(() => {
  fixture = makeTestFixture();
  env = makeTestEnv();
  props = { inMenu: false, toggleHome: () => {} };
});

afterEach(() => {
  fixture.remove();
});

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

test("can be rendered", async () => {
  const navbar = new Navbar(env, props);
  await navbar.mount(fixture);
  expect(fixture.innerHTML).toMatchSnapshot();
});

test("can render one menu item", async () => {
  env.menus.push({ title: "menu", actionID: 4 });
  const navbar = new Navbar(env, props);
  await navbar.mount(fixture);
  expect(fixture.innerHTML).toMatchSnapshot();
});

test("mobile mode: navbar is different", async () => {
  env.isMobile = true;
  const navbar = new Navbar(env, props);
  await navbar.mount(fixture);
  expect(fixture.innerHTML).toMatchSnapshot();
});
