"""Render the six language versions of the shared forum."""

from html import escape
import json
from pathlib import Path


SOURCE = Path(__file__).resolve().parent
COPY = json.loads((SOURCE / "forum.json").read_text(encoding="utf-8"))
BOARDS = ("zgloszenia", "pomysly", "usprawnienia", "rozmowy-ai", "pomoc", "instalacja")
TOPICS = json.loads((SOURCE / "forum-topics.json").read_text(encoding="utf-8"))


def owner_panel():
    panel = (SOURCE / "forum-panel.html").read_text(encoding="utf-8")
    boards = "\n".join(
        f'<option value="{key}">{escape(title)}</option>'
        for key, title in zip(BOARDS, COPY["boardNames"][0], strict=True)
    )
    return panel.replace("<!-- panel-boards -->", boards)


def contact_form(t, heading, key, endpoint, submit, privacy_link):
    hardware = endpoint == "hardware"
    description = t("condition" if hardware else "comment")
    required = ' minlength="8" required' if hardware else ""
    return f'''
    <details class="forum-contact-card" id="{key}" name="contact-forms">
      <summary>{t(heading)}</summary>
      <form class="blog-form" data-endpoint="{endpoint}" method="post">
        <label>{t("email")} <input name="email" type="email" maxlength="254" autocomplete="email" required></label>
        <label>{t("model")} <select name="model" required>
          <option value="">{t("choose")}</option><option>Connect</option><option>Smart</option><option value="Inny">{t("other")}</option>
        </select></label>
        <div class="form-location">
          <label>{t("postal")} <input name="postalCode" autocomplete="section-{endpoint} postal-code" maxlength="16"></label>
          <label>{t("city")} <input name="city" autocomplete="section-{endpoint} address-level2" maxlength="100"></label>
        </div>
        <label>{description} <textarea name="description" maxlength="800" rows="4"{required}></textarea></label>
        <label class="consent"><input type="checkbox" name="consent" required> {t("consent")}</label>
        <div class="form-trap" aria-hidden="true"><input name="website" aria-label="Website" tabindex="-1" autocomplete="off"></div>
        <div class="forum-submit"><button type="submit">{t(submit)}</button> {privacy_link}</div>
        <p role="status"></p>
      </form>
    </details>'''


def render(code, index, site, language_nav, alternate_links, repository):
    copy = {name: texts[index] for name, texts in COPY.items()}
    copy["pinnedTopics"] = {}
    for board in BOARDS:
        copy["pinnedTopics"][board] = []
        for topic in TOPICS[board]:
            title, body = topic[code]
            entry = {"id": topic["id"], "name": "Lidlomix Pro", "title": title, "body": body}
            if topic.get("guide"):
                entry["guide"] = True
            copy["pinnedTopics"][board].append(entry)

    def t(key):
        return escape(copy[key])

    prefix = "" if code == "pl" else "../"
    category_links = "\n".join(
        f'<a href="#{key}" data-board="{key}">{escape(title)}</a>'
        for key, title in zip(BOARDS, copy["boardNames"], strict=True)
    )
    language_data = json.dumps(copy, ensure_ascii=False).replace("<", "\\u003c")
    privacy = escape(site.get("privacy", "Polityka prywatności"))
    privacy_link = f'<a href="prywatnosc.html">{privacy}</a>'
    footer = escape(site.get("footer", "Lidlomix Pro to autorski, niezależny projekt Beniamina Żaka. Nazwy Lidl, Monsieur Cuisine i SilverCrest należą do ich właścicieli."))
    panel = owner_panel() if code == "pl" else ""
    panel_link = ' · <button type="button" class="panel-opener" data-open-owner-panel>Panel projektu</button>' if panel else ""
    return f'''<!doctype html>
<html lang="{code}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{t("title")}</title>
  <meta name="description" content="{t("intro")}">
  {alternate_links}
  <link rel="stylesheet" href="{prefix}styl.css?v=naglowki-2">
  <link rel="stylesheet" href="{prefix}languages.css">
  <link rel="stylesheet" href="{prefix}forum.css?v=boards-1">
  <script src="{prefix}blog.js?v=boards-1" defer></script>
  <script src="{prefix}forum.js?v=boards-1" defer></script>
</head>
<body class="forum-page">
<a class="localized-skip" href="#forum">{escape(site.get("skip", "Przejdź do treści"))}</a>
<header>
  <div class="wrap">
    <a class="brand" href="index.html">Lidlomix <b>Pro</b></a>
    <a class="forum-home" href="index.html"><span aria-hidden="true">←</span> {t("home")}</a>
  </div>
  {language_nav}
</header>
<main class="wrap" id="forum">
  <div class="forum-intro">
    <div><h1>{t("title")}</h1><p>{t("intro")}</p></div>
    <nav aria-label="{t("title")}">
      <a href="#zasady" data-open-rules>{t("rules")}</a>
      <a href="#kontakt">{t("private")}</a>
    </nav>
  </div>
  <p class="forum-preview" data-forum-preview hidden>{t("preview")}</p>
  <div class="forum-layout">
    <aside class="board-sidebar">
      <h2>{t("sections")}</h2>
      <nav aria-label="{t("sections")}">{category_links}</nav>
    </aside>
    <section class="topic-panel" id="{BOARDS[0]}" aria-labelledby="board-title">
      <div class="board-heading">
        <div><h2 id="board-title">{escape(copy["boardNames"][0])}</h2>
        <p data-board-description>{escape(copy["boardDescriptions"][0])}</p></div>
        <button type="button" data-compose>{t("newTopic")}</button>
      </div>
      <div class="topic-controls">
        <h3>{t("topics")}</h3>
        <input type="search" data-topic-search aria-label="{t("search")}" placeholder="{t("search")}">
      </div>
      <div class="topic-language-note">
        <label><input type="checkbox" data-all-languages> {t("allLanguages")}</label>
        <p>{t("original")}</p>
      </div>
      <section data-pinned-section>
        <h4 class="topic-section-title">{t("pinned")}</h4>
        <div data-pinned-list></div>
      </section>
      <section>
        <h4 class="topic-section-title">{t("community")}</h4>
        <div data-topic-list></div>
      </section>
      <div class="topic-state">
        <p data-topic-status role="status">{t("loading")}</p>
        <button type="button" class="forum-neutral" data-topic-more hidden>{t("more")}</button>
        <button type="button" class="forum-neutral" data-topic-retry hidden>{t("retry")}</button>
      </div>
    </section>
  </div>
  <details class="forum-contact-card forum-rules" id="zasady">
    <summary>{t("rules")}</summary>
    <ol><li>{t("rule1")}</li><li>{t("rule2")}</li><li>{t("rule3")}</li><li>{t("recipeRule")}</li></ol>
    <p data-forum-approval-status>{t("approval")}</p>
  </details>
  <section class="forum-private" id="kontakt">
    <h2>{t("private")}</h2><p>{t("contactIntro")}</p>
    <div class="forum-contact-options">{contact_form(t, "waitlist", "aktualizacje", "waitlist", "join", privacy_link)}{contact_form(t, "hardware", "sprzet", "hardware", "offer", privacy_link)}
    </div>
  </section>
  <dialog class="forum-dialog" id="forum-composer" aria-labelledby="compose-title">
    <div class="forum-dialog-heading"><h2 id="compose-title">{t("newTopic")}</h2>
      <button type="button" class="forum-neutral" data-close-dialog>{t("close")}</button></div>
    <form class="blog-form" data-endpoint="comments" method="post">
      <input name="post" type="hidden"><input name="replyTo" type="hidden">
      <input name="locale" type="hidden" value="{code}">
      <label data-topic-title>{t("subject")} <input name="title" minlength="4" maxlength="100" required></label>
      <label>{t("name")} <input name="name" maxlength="40" required></label>
      <label>{t("message")} <textarea name="body" minlength="3" maxlength="1200" rows="6" required></textarea></label>
      <div data-recipe-source hidden>
        <label>{t("recipeSource")} <input name="recipeUrl" type="url" maxlength="512" pattern="https://.+" placeholder="https://" disabled></label>
      </div>
      <div data-topic-attachment hidden>
        <label>{t("file")} <input type="file" name="image" accept="image/png,image/jpeg,image/webp" disabled></label>
        <p class="form-hint">{t("fileHint")}</p>
      </div>
      <div class="form-trap" aria-hidden="true"><input name="website" aria-label="Website" tabindex="-1" autocomplete="off"></div>
      <div class="forum-submit"><button type="submit">{t("send")}</button>
        <a href="#zasady" data-open-rules>{t("rules")}</a> {privacy_link}</div>
      <p role="status"></p>
    </form>
  </dialog>
  <dialog class="forum-dialog image-dialog" id="forum-image" aria-label="{t("attachment")}">
    <button type="button" class="forum-neutral" data-close-dialog>{t("close")}</button>
    <img alt="{t("attachment")}">
  </dialog>
</main>
<footer><div class="wrap site-footer">
  <div><p>{footer}</p><a href="{repository}">GitHub</a>{panel_link}</div>{privacy_link}
</div></footer>
<script type="application/json" id="forum-copy">{language_data}</script>
{panel}
</body>
</html>
'''
