import { Context } from "./context";
import { Middleware } from "./composer";
export type Dictionary = Record<string, string | ((...args: any[]) => string)>;
export type Locales = Record<string, Dictionary>;
export interface I18nOptions {
    locales: Locales;
    defaultLocale: string;
    /** Defaults to reading ctx.from.language_code (what Telegram clients send). */
    getLocale?: (ctx: Context) => string | undefined;
}
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
export declare function createI18n(opts: I18nOptions): {
    translate: (locale: string | undefined, key: string, ...args: unknown[]) => string;
    middleware(): Middleware<Context>;
};
