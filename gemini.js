const isDev = location.host.endsWith("gemini-js.pages.dev");
const frameOrigin = isDev ? location.origin : "https://gmetrics.getbeamer.com";

function addIframe() {
  const iframe = document.createElement("iframe");
  const src = `${frameOrigin}/frame`;
  iframe.setAttribute("src", src);
  iframe.setAttribute("style", "display:none");
  document.body.appendChild(iframe);

  return iframe;
}

var __gemini_ctx = {
  id: null,
  resolve: function () {},
};

function getGeminiId() {
  return new Promise(function (resolve) {
    if (__gemini_ctx.id) return resolve(__gemini_ctx.id);
    __gemini_ctx.resolve = resolve;
  });
}

function start() {
  let lastHref = null;
  const frame = addIframe();

  addEventListener("message", (event) => {
    // Limit to getbeamer and pages domains
    if (
      /^https:\/\/(.*)(getbeamer\.com|gemini-js\.pages\.dev)$/.test(
        event.origin
      ) &&
      event.data.status === "geminiReady"
    ) {
      __gemini_ctx.id = event.data.geminiId;
      __gemini_ctx.resolve(event.data.geminiId);
      setInterval(looper, 200);
    }
  });

  function looper() {
    if (lastHref === location.href) return;
    // Special case for push.getbeamer.com
    // We reterive ref from query param and use it as referrer
    const qs = new URLSearchParams(location.search);
    const urlRef = qs.get("ref") || "";
    frame.contentWindow.postMessage(
      {
        attributes: {
          host: location.host,
          path: location.pathname,
          hash_path: location.hash,
          referrer: document.referrer || urlRef,
          search: location.search,
        },
        identity: {
          user_id: (window._account && "" + window._account.user_id) || null,
          account_id:
            (window._account && "" + window._account.product_id) || null,
        },
      },
      frameOrigin
    );

    lastHref = location.href;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
