---
name: Bug report
about: Something tokenized wrong or broke in the UI
title: "[BUG] "
labels: bug
assignees: ''
---

**What happened?**

**The text you tokenized** (paste it here — this is usually the whole bug):

```
your text here
```

**Which model(s) were selected?**

**Expected vs actual** — if you have official tiktoken output, paste it:

```python
import tiktoken
tiktoken.get_encoding("...").encode("...")
# -> [...]
```

**Environment:** browser + OS

**Screenshots** if it's visual.
