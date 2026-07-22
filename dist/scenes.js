"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = exports.WizardScene = void 0;
const SESSION_KEY = "__ayotbl_scene";
function sceneSession(ctx) {
    if (!ctx.session) {
        throw new Error("Scenes require session() middleware to be mounted before stage.middleware(). See ayotbl README.");
    }
    const existing = ctx.session[SESSION_KEY];
    if (existing)
        return existing;
    const fresh = { cursor: 0, state: {} };
    ctx.session[SESSION_KEY] = fresh;
    return fresh;
}
class WizardScene {
    id;
    steps;
    constructor(id, steps) {
        this.id = id;
        this.steps = steps;
    }
    async runStep(ctx, index) {
        const step = this.steps[index];
        if (!step)
            return; // past the last step
        await step(ctx);
    }
    get stepCount() {
        return this.steps.length;
    }
}
exports.WizardScene = WizardScene;
/** Registers scenes and installs the routing middleware that dispatches updates to whichever scene is active. */
class Stage {
    scenes = new Map();
    constructor(scenes = []) {
        for (const s of scenes)
            this.scenes.set(s.id, s);
    }
    register(...scenes) {
        for (const s of scenes)
            this.scenes.set(s.id, s);
        return this;
    }
    middleware() {
        return async (ctx, next) => {
            const sess = sceneSession(ctx);
            const wizardCtx = ctx;
            wizardCtx.scene = {
                current: sess.current,
                enter: async (sceneId, initialState = {}) => {
                    if (!this.scenes.has(sceneId))
                        throw new Error(`ayotbl: no scene registered with id "${sceneId}"`);
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
    buildWizardState(ctx, sess) {
        return {
            cursor: sess.cursor,
            state: sess.state,
            // Advances the pointer only — the next step body runs when the *next* update arrives,
            // not immediately, so e.g. "ask for name" and "ask for age" don't both fire in one turn.
            next: async () => {
                sess.cursor += 1;
                const scene = this.scenes.get(sess.current);
                if (!scene || sess.cursor >= scene.stepCount) {
                    sess.current = undefined;
                    sess.cursor = 0;
                }
            },
            // Jumps the pointer AND runs that step immediately — useful for "go back to step 2 right now".
            selectStep: async (index) => {
                sess.cursor = index;
                ctx.wizard = this.buildWizardState(ctx, sess);
                await this.scenes.get(sess.current)?.runStep(ctx, index);
            },
        };
    }
    async runCurrent(ctx, sess) {
        const scene = this.scenes.get(sess.current);
        if (!scene)
            return;
        ctx.wizard = this.buildWizardState(ctx, sess);
        await scene.runStep(ctx, sess.cursor);
    }
}
exports.Stage = Stage;
//# sourceMappingURL=scenes.js.map