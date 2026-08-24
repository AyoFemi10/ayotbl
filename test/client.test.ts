import { test } from "node:test";
import assert from "node:assert/strict";
import { Transport, TelegramApiError } from "../src/client";

function withMockedFetch<T>(impl: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const original = global.fetch;
  (global as any).fetch = impl;
  return fn().finally(() => {
    (global as any).fetch = original;
  });
}

test("Transport.call() parses a successful JSON response", async () => {
  await withMockedFetch(
    (async () =>
      new Response(JSON.stringify({ ok: true, result: { id: 42, is_bot: true, first_name: "Bot" } }), { status: 200 })) as typeof fetch,
    async () => {
      const transport = new Transport("fake-token");
      const result = await transport.call<{ id: number }>("getMe");
      assert.equal(result.id, 42);
    }
  );
});

test("Transport.call() throws a TelegramApiError with the description on ok:false", async () => {
  await withMockedFetch(
    (async () =>
      new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: chat not found" }), { status: 400 })) as typeof fetch,
    async () => {
      const transport = new Transport("fake-token");
      await assert.rejects(() => transport.call("sendMessage", { chat_id: 999, text: "hi" }), (err: unknown) => {
        assert.ok(err instanceof TelegramApiError);
        assert.equal(err.errorCode, 400);
        assert.match(err.message, /chat not found/);
        return true;
      });
    }
  );
});

test("Transport.call() automatically retries on 429 using retry_after, then succeeds", async () => {
  let attempts = 0;
  const impl = (async () => {
    attempts++;
    if (attempts < 3) {
      return new Response(
        JSON.stringify({ ok: false, error_code: 429, description: "Too Many Requests", parameters: { retry_after: 0 } }),
        { status: 429 }
      );
    }
    return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
  }) as typeof fetch;

  await withMockedFetch(impl, async () => {
    const transport = new Transport("fake-token", { floodControl: { maxRetries: 5 } });
    const result = await transport.call<boolean>("deleteMessage", { chat_id: 1, message_id: 1 });
    assert.equal(result, true);
    assert.equal(attempts, 3, "should have retried twice before succeeding on the third attempt");
  });
});

test("Transport.call() gives up and throws after exceeding maxRetries on repeated 429s", async () => {
  let attempts = 0;
  const impl = (async () => {
    attempts++;
    return new Response(
      JSON.stringify({ ok: false, error_code: 429, description: "Too Many Requests", parameters: { retry_after: 0 } }),
      { status: 429 }
    );
  }) as typeof fetch;

  await withMockedFetch(impl, async () => {
    const transport = new Transport("fake-token", { floodControl: { maxRetries: 2 } });
    await assert.rejects(() => transport.call("deleteMessage", { chat_id: 1, message_id: 1 }));
    assert.equal(attempts, 3, "initial attempt + 2 retries = 3 total calls");
  });
});

async function drainBody(body: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test("Transport streams a local file path as real multipart/form-data, not buffered into a Blob", async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const tmpFile = path.join(os.tmpdir(), `ayotbl-test-${Date.now()}.txt`);
  await fs.writeFile(tmpFile, "streamed file content for the test");

  let capturedInit: RequestInit & { duplex?: string } = {};
  const impl = (async (_url: string, init: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
  }) as typeof fetch;

  await withMockedFetch(impl, async () => {
    const transport = new Transport("fake-token");
    await transport.call("sendDocument", { chat_id: 1, document: { source: tmpFile } });
  });

  assert.match(String((capturedInit.headers as Record<string, string>)["content-type"]), /^multipart\/form-data; boundary=/);
  assert.equal(capturedInit.duplex, "half");

  const bodyText = (await drainBody(capturedInit.body as AsyncIterable<Uint8Array>)).toString("utf-8");
  assert.match(bodyText, /streamed file content for the test/);
  assert.match(bodyText, /filename="ayotbl-test-\d+\.txt"/);

  await fs.unlink(tmpFile);
});

test("Transport streams a real Node Readable without buffering it into memory first", async () => {
  const { Readable } = await import("node:stream");
  let capturedInit: RequestInit = {};
  const impl = (async (_url: string, init: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
  }) as typeof fetch;

  await withMockedFetch(impl, async () => {
    const transport = new Transport("fake-token");
    const stream = Readable.from([Buffer.from("chunk-a "), Buffer.from("chunk-b")]);
    await transport.call("sendDocument", { chat_id: 1, document: { source: stream, filename: "streamed.bin" } });
  });

  const bodyText = (await drainBody(capturedInit.body as AsyncIterable<Uint8Array>)).toString("utf-8");
  assert.match(bodyText, /chunk-a chunk-b/);
  assert.match(bodyText, /filename="streamed\.bin"/);
});

test("Transport still sends Buffer uploads via the original FormData path (no regression)", async () => {
  let capturedInit: RequestInit = {};
  const impl = (async (_url: string, init: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
  }) as typeof fetch;

  await withMockedFetch(impl, async () => {
    const transport = new Transport("fake-token");
    await transport.call("sendPhoto", { chat_id: 1, photo: { source: Buffer.from("fake bytes"), filename: "p.jpg" } });
  });

  assert.equal((capturedInit.body as { constructor: { name: string } }).constructor.name, "FormData");
});
