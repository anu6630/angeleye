# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interactive-oauth.spec.ts >> Interactive OAuth test
- Location: tests/e2e/interactive-oauth.spec.ts:10:5

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "NotebookSocial" [ref=e4] [cursor=pointer]:
        - /url: /
        - img [ref=e6]
        - generic [ref=e9]: NotebookSocial
      - navigation "Main" [ref=e10]:
        - link "Feed" [ref=e11] [cursor=pointer]:
          - /url: /feed
          - button "Feed" [ref=e12]:
            - img [ref=e13]
            - text: Feed
        - link "Search" [ref=e16] [cursor=pointer]:
          - /url: /search
          - button "Search" [ref=e17]:
            - img [ref=e18]
            - text: Search
        - link "My notebooks" [ref=e21] [cursor=pointer]:
          - /url: /my-notebooks
          - button "My notebooks" [ref=e22]:
            - img [ref=e23]
            - text: My notebooks
        - link "New" [ref=e26] [cursor=pointer]:
          - /url: /notebooks/new
          - button "New" [ref=e27]:
            - img [ref=e28]
            - text: New
      - generic [ref=e31]:
        - link "Sign in" [ref=e32] [cursor=pointer]:
          - /url: /login
          - img [ref=e33]
          - text: Sign in
        - link "Join" [ref=e36] [cursor=pointer]:
          - /url: /
  - main [ref=e37]:
    - generic [ref=e39]:
      - generic [ref=e40]:
        - paragraph [ref=e41]:
          - img [ref=e42]
          - text: Draft in the browser · Publish from the cloud
        - generic [ref=e44]:
          - heading "Notebooks as social posts. Edit fast with WASM. Ship with Docker." [level=1] [ref=e45]:
            - text: Notebooks as social posts.
            - generic [ref=e46]: Edit fast with WASM. Ship with Docker.
          - paragraph [ref=e47]: "NotebookSocial is a feed for computational work: write Python notebooks in the editor, run cells locally for speed, then compile in an isolated container when you are ready to publish for everyone."
        - generic [ref=e48]:
          - generic [ref=e49]:
            - img [ref=e50]
            - heading "WASM editing" [level=3] [ref=e54]
            - paragraph [ref=e55]: Try ideas in the browser without waiting on the server.
          - generic [ref=e56]:
            - img [ref=e57]
            - heading "Container compile" [level=3] [ref=e61]
            - paragraph [ref=e62]: One click sends your notebook to a reproducible build.
          - generic [ref=e63]:
            - img [ref=e64]
            - heading "Fork & remix" [level=3] [ref=e69]
            - paragraph [ref=e70]: Every fork is a first-class post in the feed.
        - generic [ref=e71]:
          - link "Browse feed" [ref=e72] [cursor=pointer]:
            - /url: /feed
          - link "Sign in" [ref=e73] [cursor=pointer]:
            - /url: /login
      - generic [ref=e75]:
        - generic [ref=e76]:
          - heading "Join or sign in" [level=3] [ref=e77]
          - paragraph [ref=e78]: OAuth for speed, or email if you prefer a password.
        - generic [ref=e79]:
          - generic [ref=e80]:
            - button "Sign in with Google" [ref=e81] [cursor=pointer]:
              - img [ref=e83]
              - generic [ref=e88]: Sign in with Google
            - button "Sign in with Facebook" [ref=e89] [cursor=pointer]:
              - img [ref=e91]
              - generic [ref=e93]: Sign in with Facebook
          - generic [ref=e94]: or
          - button "Continue with email" [ref=e96] [cursor=pointer]
          - paragraph [ref=e97]: By continuing you agree to the terms and privacy policy for this demo environment.
  - alert [ref=e98]
```