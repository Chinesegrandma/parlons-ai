"""Browser regression: the real CSS must leave visible space for chat history."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
styles = "\n".join(
    (root / "app" / f"{name}.css").read_text()
    for name in ("globals", "studio", "sage-glass", "chat-learning", "challenges", "cloud-auth")
)
markup = """<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>""" + styles + """</style></head>
<body><div class="parlons-app sage-conversation"><main class="conversation-page">
<div class="chat-heading"><button>Back</button><h1>Camille</h1></div>
<div class="chat-mode-picker"><button class="chat-mode-summary">Practice mode</button></div>
<section class="focused-chat"><div class="lookup-surface"><div class="conversation-layout">
<div class="conversation"><article class="message assistant"><div class="bubblewrap"><div class="bubble">Bonjour !</div></div></article>
<article class="message user"><div class="bubblewrap"><div class="bubble">Un café, s'il vous plaît.</div></div></article></div>
</div></div><section class="practice-aid"><button>Hint</button></section>
<div class="composerarea"><div class="composer"><textarea rows="1"></textarea><button class="mic">Mic</button></div></div>
</section></main></div></body></html>"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width, height in ((390, 750), (390, 350), (1280, 800)):
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(markup)
        page.add_style_tag(content=f":root {{ --chat-viewport-height: {height}px; }}")
        page.wait_for_timeout(500)
        history = page.locator(".conversation")
        bounds = history.bounding_box()
        assert bounds and bounds["height"] >= 75, (width, height, bounds)
        assert page.locator(".bubble").first.is_visible()
        assert page.locator(".bubble").first.bounding_box()["y"] < bounds["y"] + bounds["height"]
        assert page.locator(".composer").bounding_box()["y"] + page.locator(".composer").bounding_box()["height"] <= height + 1
        # Both history and composer must remain accessible with many messages.
        history.evaluate("(node) => {const a=node.lastElementChild; for(let i=0;i<20;i++) node.append(a.cloneNode(true)); node.scrollTop=node.scrollHeight;}")
        assert history.evaluate("(node) => node.scrollHeight > node.clientHeight && node.scrollTop > 0")
        if width >= 1024:
            page.locator(".conversation-layout").evaluate("(node) => {node.classList.add('has-learning'); const rail=document.createElement('div');rail.className='learning-rail';rail.textContent='Correction';node.append(rail);}")
            assert history.bounding_box()["height"] >= 75
            assert page.locator(".learning-rail").bounding_box()["width"] >= 300
        page.close()
    browser.close()
