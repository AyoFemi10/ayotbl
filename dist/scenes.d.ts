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
export type WizardContext<C extends Context = Context> = C & {
    wizard: WizardState;
    scene: SceneApi;
};
export type SceneStep<C extends Context = Context> = (ctx: WizardContext<C>) => unknown | Promise<unknown>;
export declare class WizardScene<C extends Context = Context> {
    readonly id: string;
    private steps;
    constructor(id: string, steps: SceneStep<C>[]);
    runStep(ctx: C, index: number): Promise<void>;
    get stepCount(): number;
}
/** Registers scenes and installs the routing middleware that dispatches updates to whichever scene is active. */
export declare class Stage<C extends Context = Context> {
    private scenes;
    constructor(scenes?: WizardScene<C>[]);
    register(...scenes: WizardScene<C>[]): this;
    middleware(): Middleware<C>;
    private buildWizardState;
    private runCurrent;
}
