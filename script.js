const isDev = (host) => host.endsWith('gemini-js.pages.dev') || host.endsWith('getbeamer.ue.r.appspot.com')
const allowedOrigns = /^https:\/\/(.*)(getbeamer\.com|gemini-js\.pages\.dev|getbeamer\.ue\.r\.appspot\.com)$/

__gemini = {
  lastHref: '',

  // while scrolling, we update the hash for each section. So wait until
  // scroll is ended before firing the location change
  isScrolling: false,

  // Retrieve the URL for the specified deployment stage.
  getApiUrl() {
    // we no-longer call directly
    // return 'https://gemini.getbeamer.com/async/event'
    return '/events'
  },

  // Gemini-friendly deployment_stage
  getStage(host) {
    return isDev(host) ? 'staging' : 'production'
  },

  // generate UUIDV4 courtesy of https://github.com/30-seconds/30-seconds-of-code
  uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    )
  },

  // Gemini requires nulls for empty attributes. Ensures correct normalization.
  emptyToNull(val) {
    if (val === '' || val === undefined) {
      return null
    }
    return val
  },

  geminiCookie() {
    const key = 'gemini-beamer'
    let val = localStorage.getItem(key)
    if (!val) {
      val = this.uuid()
      localStorage.setItem(key, val)
    }

    return val
  },

  buildEvent({ attributes, identity }, annotations) {
    const subdomain = attributes.host.split('.')[0]
    const typ = subdomain === 'www' ? 'marketing' : 'app'

    const event = {
      metadata: {
        uuid: this.uuid(),
        schema_name: typ + '_routes',
        deployment_stage: this.getStage(attributes.host),
        triggered_at: new Date().toISOString(),
        trigger_location: 'page',
        trigger_origin: typ + '_frontend',
        user_agent: navigator.userAgent,
      },

      // Most of identity is handled by backend except for cookie ID, which is stored
      // locally in the frontend.
      identity: {
        cookie_id: this.geminiCookie(),
        user_id: identity.user_id,
        account_id: identity.account_id,
        impersonator_id: null,
      },

      attributes: {
        host: this.emptyToNull(attributes.host),
        path: this.emptyToNull(attributes.path),
        hash_path: this.emptyToNull(attributes.hash_path),
        referrer: this.emptyToNull(attributes.referrer),
        search: this.emptyToNull(attributes.search),
      },
    }

    event.annotations = annotations || []
    return event
  },

  // POST the event to the backend proxy endpoint.
  send(geminiEvent, dryRun) {
    if (dryRun) {
      return Promise.resolve({
        message: 'DRY RUN: Would have sent event.',
        event: geminiEvent,
        eventString: JSON.stringify(geminiEvent),
      })
    }

    const xhr = new XMLHttpRequest()
    xhr.responseType = 'json'
    xhr.open('POST', this.getApiUrl())
    xhr.setRequestHeader('content-type', 'application/json')
    xhr.setRequestHeader('accept', 'application/json')

    // Include a key to help ensure some validity to the events.
    xhr.setRequestHeader('x-api-key', 'def456')

    return new Promise((res) => {
      xhr.onload = () => res(xhr.response)
      xhr.send(JSON.stringify(geminiEvent))
    })
  },
}

parent.postMessage({ status: 'geminiReady', geminiId: __gemini.geminiCookie() }, '*')
addEventListener('message', e => {
  if (allowedOrigns.test(e.origin) && e.data.attributes && e.data.identity && e.data.attributes.path) {
    const { attributes, identity } = e.data
    const evt = __gemini.buildEvent({ attributes, identity })
    __gemini.send(evt).catch(console.error)
  }
})