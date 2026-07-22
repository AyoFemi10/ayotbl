"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createI18n = createI18n;
/**
 * Attaches `ctx.t(key, ...args)`, translating using the user's Telegram
 * `language_code` with a fallback to `defaultLocale`. Interpolation is up to
 * you — a dictionary value can be a plain string or a function for
 * pluralization/placeholders.
 *
 *   const i18n = createI18n({
 *     defaultLocale: 'en',
 *     locales: {
 *       en: { greeting: (name) => `Hello, ${name}!` },
 *       fr: { greeting: (name) => `Bonjour, ${name}!` },
 *     },
 *   });
 *   bot.use(i18n.middleware());
 *   bot.command('start', (ctx) => ctx.reply(ctx.t('greeting', ctx.from?.first_name)));
 */
function createI18n(opts) {
    const getLocale = opts.getLocale ?? ((ctx) => ctx.from?.language_code);
    function translate(locale, key, ...args) {
        const dict = (locale && opts.locales[locale]) || opts.locales[opts.defaultLocale] || {};
        const entry = dict[key];
        if (entry === undefined)
            return key; // missing translation — fail loud-ish but not throw
        return typeof entry === "function" ? entry(...args) : entry;
    }
    return {
        translate,
        middleware() {
            return (ctx, next) => {
                const locale = getLocale(ctx);
                ctx.locale = locale;
                ctx.t = (key, ...args) => translate(locale, key, ...args);
                return next();
            };
        },
    };
}
//# sourceMappingURL=i18n.js.map