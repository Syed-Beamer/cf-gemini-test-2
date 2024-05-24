### gemini.js

Repo contains `gemini.js` which creates a iframe for `src="gmetrics.getbeamer.com"`. This will allow us to use the same `gmetrics` subdomain in all places where this script is used. Hence the localStorage of `gmetrics` can be reused for `geminiCookie()`.

#### Include gemini.js in the top level window

```html
<script src="https://gmetrics.getbeamer.com/gemini.js"></script>
```

### Getting GeminiId

`GeminiId` is a unique cookie uuid that is used for identifying anonymous users and tie it to logged in users. Since `GeminiId` is stored inside a separate domain (like gmetrics.gemini.com) via iframe, `getGeminiId` is exposed as a method that returns a promise which reolves to the unique id.

```js
const promise = window['getGeminiId']
  ? window['getGeminiId']()
  : Promise.resolve('00000000-0000-0000-0000-000000000000')

promise.then((id) => {
  console.log(id)
})
```
