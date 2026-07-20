import { Context } from "./context";
import { Middleware } from "./composer";

/**
 * Multi-step conversations: "ask name → ask age → confirm". Requires
 * `session()` middleware mounted first (Scenes stores its cursor + collected
 * answers inside ctx.session).
 * *   const signup = new WizardScene<Context>('signup', [
 *     async (ctx) => { await ctx.reply('What is your name?'); await ctx.wizard.next(); },
 *     async (ctx) => { ctx.wizard.state.name = ctx.text; await ctx.reply('How old are you?'); await ctx.wizard.next(); },
 *     async (ctx) => { ctx.wizard.state.age = ctx.text; await ctx.reply(`Thanks ${ctx.wizard.state.name}!`); await ctx.scene.leave(); },
 *   ]);
 *
 *   const stage = new Stage([signup]);
 *   bot.use(session());
 *   bot.use(stage.middleware());
 *   bot.command('signup', (ctx) => ctx.scene.enter('signup'));
 *
 * Each step function runs once per incoming update while the scene is active.
 * Call `ctx.wizard.next()` at the end of a step once you're ready to move on —
 * it only advances the pointer; the next step's body runs when the *next*
 * update arrives, not immediately (so "ask for name" and "ask for age" don't
 * both fire in the same turn).
 */

export interface WizardState {
  cursor: number;
  state: Record<string, unknown>;
  /** Advance to the next step within this same update (e.g. to skip a step programmatically). */
  next: () => Promise<void>;
  /** Jump straight to a specific step index (0-based), e.g. to go "back". */
  selectStep: (index: number) => Promise<void>;
}

export interface SceneApi {
  enter: (sceneId: string, initialState?: Record<string, unknown>) => Promise<void>;
  leave: () => Promise<void>;
  current: string | undefined;
}

export type WizardContext<C extends Context = Context> = C & { wizard: WizardState; scene: SceneApi };
export type SceneStep<C extends Context = Context> = (ctx: WizardContext<C>) => unknown | Promise<unknown>;

interface SceneSessionData {
  current?: string;
  cursor: number;
  state: Record<string, unknown>;
}

const SESSION_KEY = "__ayotbl_scene";

function sceneSession(ctx: Context): SceneSessionData {
  if (!ctx.session) {
    throw new Error("Scenes require session() middleware to be mounted before stage.middleware(). See ayotbl README.");
  }
  const existing = ctx.session[SESSION_KEY] as SceneSessionData | undefined;
  if (existing) return existing;
  const fresh: SceneSessionData = { cursor: 0, state: {} };
  ctx.session[SESSION_KEY] = fresh;
  return fresh;
}

export class WizardScene<C extends Context = Context> {
  constructor(public readonly id: string, private steps: SceneStep<C>[]) {}

  async runStep(ctx: C, index: number): Promise<void> {
    const step = this.steps[index];
    if (!step) return; // past the last step
    await step(ctx as WizardContext<C>);
  }

  get stepCount(): number {
    return this.steps.length;
  }
}

/** Registers scenes and installs the routing middleware that dispatches updates to whichever scene is active. */
export class Stage<C extends Context = Context> {
  private scenes = new Map<string, WizardScene<C>>();

  constructor(scenes: WizardScene<C>[] = []) {
    for (const s of scenes) this.scenes.set(s.id, s);
  }

  register(...scenes: WizardScene<C>[]): this {
    for (const s of scenes) this.scenes.set(s.id, s);
    return this;
  }

  middleware(): Middleware<C> {
    return async (ctx, next) => {
      const sess = sceneSession(ctx);
      const wizardCtx = ctx as WizardContext<C>;

      wizardCtx.scene = {
        current: sess.current,
        enter: async (sceneId, initialState = {}) => {
          if (!this.scenes.has(sceneId)) throw new Error(`ayotbl: no scene registered with id "${sceneId}"`);
          sess.current = sceneId;
          sess.cursor = 0;
          sess.state = initialState;
          await this.runCurrent(ctx, sess);
        },
        leave: async () => {
          sess.current = undefined;
          sess.cursor = 0;
          sess.state = {};
        },
      };

      if (sess.current && this.scenes.has(sess.current)) {
        wizardCtx.wizard = this.buildWizardState(ctx, sess);
        await this.runCurrent(ctx, sess);
        return; // a scene owns this update — don't fall through to other handlers
      }

      return next();
    };
  }

  private buildWizardState(ctx: C, sess: SceneSessionData): WizardState {
    return {
      cursor: sess.cursor,
      state: sess.state,
      // Advances the pointer only — the next step body runs when the *next* update arrives,
      // not immediately, so e.g. "ask for name" and "ask for age" don't both fire in one turn.
      next: async () => {
        sess.cursor += 1;
        const scene = this.scenes.get(sess.current!);
        if (!scene || sess.cursor >= scene.stepCount) {
          sess.current = undefined;
          sess.cursor = 0;
        }
      },
      // Jumps the pointer AND runs that step immediately — useful for "go back to step 2 right now".
      selectStep: async (index: number) => {
        sess.cursor = index;
        (ctx as WizardContext<C>).wizard = this.buildWizardState(ctx, sess);
        await this.scenes.get(sess.current!)?.runStep(ctx, index);
      },
    };
  }

  private async runCurrent(ctx: C, sess: SceneSessionData): Promise<void> {
    const scene = this.scenes.get(sess.current!);
    if (!scene) return;
    (ctx as WizardContext<C>).wizard = this.buildWizardState(ctx, sess);
    await scene.runStep(ctx, sess.cursor);
  }
}
