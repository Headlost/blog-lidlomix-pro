"""Build the localized GitHub Pages HTML from the editorial copy."""

from html import escape, unescape
import json
from pathlib import Path
import re

import forum

ROOT = Path(__file__).resolve().parent
DOCS = ROOT.parent / "docs"
CONTENT = json.loads((ROOT / "locales.json").read_text(encoding="utf-8"))
PROJECT = json.loads((ROOT / "project.json").read_text(encoding="utf-8"))
HISTORY = json.loads((ROOT / "history.json").read_text(encoding="utf-8"))
HISTORY_SHOTS = json.loads((ROOT / "history-shots.json").read_text(encoding="utf-8"))
PRIVACY = json.loads((ROOT / "privacy.json").read_text(encoding="utf-8"))
INSTALLATION = json.loads((ROOT / "installation.json").read_text(encoding="utf-8"))
LANGUAGES = {
    "pl": "Polski", "en": "English", "de": "Deutsch",
    "fr": "Français", "it": "Italiano", "es": "Español",
}
PAGE_URL = "https://headlost.github.io/blog-lidlomix-pro/"
REPOSITORY = "https://github.com/Headlost/blog-lidlomix-pro"
GPT_URL = "https://chatgpt.com/g/g-hAhHAqUjp-lidlomix-monsieur-cuisine"
LATEST_PL = "aktualizacje.html#wersja-0-19-9"
HISTORY_ARTICLES = (
    ("poczatki.html", "cards"),
    ("dwie-aplikacje.html", "chooser"),
    ("waga-i-przepisy.html", "scale"),
    ("lidlomix-pro-0-16-4.html", "manual"),
    ("lidlomix-pro-0-17-8.html", "sound"),
    ("lidlomix-pro-0-19-1.html", "peeler"),
)
HISTORY_PAGES = {article for article, _ in HISTORY_ARTICLES} | {"technika.html"}


def choose_language(selected, prefix="", anchor="", filename="index.html"):
    links = []
    for code, label in LANGUAGES.items():
        location = filename if code == "pl" else f"{code}/{filename}"
        if anchor and code != "pl":
            location += anchor
        current = ' aria-current="true"' if code == selected else ""
        links.append(f'<a lang="{code}" hreflang="{code}" href="{prefix}{location}"{current}>{label}</a>')
    label = escape(CONTENT[selected]["language"])
    return f'<nav class="site-languages" aria-label="{label}">{"".join(links)}</nav>'


def alternates(filename=""):
    paths = {code: f"{code}/{filename}" for code in LANGUAGES}
    paths.update({"pl": filename, "x-default": filename})
    return "\n".join(
        f'<link rel="alternate" hreflang="{code}" href="{PAGE_URL}{path}">'
        for code, path in paths.items()
    )


def screenshot(code, shot, prefix, eager=False, frame="", label=None, caption_prefix=""):
    label = escape(label or CONTENT[code]["shots"][shot])
    caption = escape(caption_prefix) + label
    path = f"{prefix}media/jezyki/{code}/{shot}.webp"
    loading = ' fetchpriority="high"' if eager else ' loading="lazy"'
    classes = f"localized-shot {frame}" if frame else "localized-shot"
    return (
        f'<figure class="{classes}"><a href="{path}">'
        f'<img src="{path}" width="1024" height="600" alt="{label}"{loading}></a>'
        f'<figcaption>{caption}</figcaption></figure>'
    )


def entries(rows, style, heading, links=()):
    items = []
    for index, (version, title, description) in enumerate(rows):
        label = escape(title)
        if links:
            label = f'<a href="{links[index]}">{label}</a>'
        items.append(
            f'<li><span class="release-tag">{escape(version)}</span>'
            f'<div><{heading}>{label}</{heading}><p>{escape(description)}</p></div></li>'
        )
    return f'<ol class="{style}">\n' + "\n".join(items) + "\n</ol>"


def update(code, historical=False):
    data = CONTENT[code]
    title = escape(data["update_title"])
    intro = escape(data["update_intro"])
    date = escape(data["date"])
    label = escape(data["latest"])
    history = ""
    if historical:
        milestone_links = ("poczatki.html", "dwie-aplikacje.html", "lidlomix-pro-0-16-4.html",
                           "lidlomix-pro-0-17-8.html", "lidlomix-pro-0-19-1.html")
        history = f'''
    <section class="history-block" aria-labelledby="history">
      <h3 id="history">{escape(data["history_title"])}</h3>
      <p>{escape(data["history_intro"])}</p>
      {entries(data["history"], "milestone-list", "h4", milestone_links)}
    </section>'''
    return f'''
  <article class="localized-update" id="{"updates" if historical else "wersja-0-19-9"}">
    <p class="localized-kicker"><span>{label}</span><time datetime="2026-11-21">{date}</time></p>
    <h2>{title}</h2>
    <p class="lead localized-intro">{intro}</p>
    {entries(data["changes"], "change-grid", "h3")}{history}
  </article>
'''.strip()


def assistant_card(code, prefix=""):
    copy = PROJECT[code]
    skills = "".join(f"<li>{escape(skill)}</li>" for skill in copy["skills"])
    stats = "".join(f"<div><dt>{escape(label)}</dt><dd>{escape(value)}</dd></div>"
                    for label, value in zip(copy["stats"][::2], copy["stats"][1::2], strict=True))
    date = f'<time datetime="2026-12-11">{escape(copy["plugin_date"])}</time>'
    plugin_status = escape(copy["plugin_status"]).format(date=date)
    caption = escape(copy["caption"])
    photo = f"{prefix}media/gpt-karta.webp"
    return f'''<section class="gpt-card" id="lidlomix-chatgpt" aria-labelledby="gpt-title">
  <div>
    <p class="eyebrow">{escape(copy["origin"])}</p>
    <h2 id="gpt-title">{escape(copy["assistant"])}</h2>
    <p>{escape(copy["intro"])}</p>
    <details class="demo"><summary>{escape(copy["capabilities"])}</summary><ul>{skills}</ul></details>
    <dl class="gpt-stats">{stats}</dl>
    <p class="stat-date">{escape(copy["stats_date"])}</p>
    <p>{escape(copy["available"])}</p>
    <div class="gpt-links">
      <a class="btn" href="{GPT_URL}">{escape(copy["gpt_link"])}</a>
      <div class="plugin-disclosure">
        <button class="plugin-trigger" type="button" aria-expanded="false" aria-controls="plugin-status">{escape(copy["plugin"])} <span aria-hidden="true">ⓘ</span></button>
        <p class="plugin-status" id="plugin-status" hidden>{plugin_status}</p>
      </div>
    </div>
  </div>
  <figure><img class="gpt-profile-preview" loading="lazy" width="572" height="500" src="{photo}" alt="{caption}">
    <figcaption>{caption}</figcaption></figure>
</section>'''


def project_history(code):
    copy = PROJECT[code]
    cards = []
    for (article, image), (title, description) in zip(HISTORY_ARTICLES, copy["stories"], strict=True):
        thumbnail = f"jezyki/{code}/{image}.webp"
        cards.append(f'''<article class="story-row localized-story">
      <img src="../media/{thumbnail}" loading="lazy" alt="">
      <div><h3><a href="{article}">{escape(title)}</a></h3>
        <p>{escape(description)}</p>
      </div>
    </article>''')
    rows = "\n".join(cards)
    return f'''<section class="localized-section story-section" id="wpisy">
  <h2>{escape(copy["history"])}</h2>
  <p class="localized-intro">{escape(copy["history_intro"])}</p>
  <div class="story-list">
    {rows}
  </div>
</section>'''


def render_history_shots(code, text):
    index = list(LANGUAGES).index(code)
    prefix = "" if code == "pl" else "../"
    caption_prefix = HISTORY_SHOTS["current"][index] + " · "

    def render(match):
        shot = match[1]
        labels = HISTORY_SHOTS.get(shot)
        photo = screenshot(code, shot, prefix, label=labels[index] if labels else None, caption_prefix=caption_prefix)
        return f"<!-- history-shot:{shot} -->{photo}<!-- /history-shot -->"

    return re.sub(r"<!-- history-shot:([a-z-]+) -->.*?<!-- /history-shot -->", render, text, flags=re.S)


def history_page(code, filename):
    fragment = (ROOT / "history" / code / filename).read_text(encoding="utf-8")
    title = unescape(re.search(r"<h1>([^<]+)</h1>", fragment)[1])
    article_page(code, filename, title, render_history_shots(code, fragment))


def privacy_page(code):
    copy = {name: escape(value) for name, value in PRIVACY[code].items() if isinstance(value, str)}
    controller = copy["controller"].format(contact=f'<a href="#kontakt">{copy["contact_link"]}</a>')
    purposes = "\n".join(f"<li><strong>{escape(title)}.</strong> {escape(body)}</li>"
                         for title, body in PRIVACY[code]["data"])
    microsoft = {"en": "en-us", "de": "de-de", "fr": "fr-fr", "it": "it-it", "es": "es-es"}[code]
    fragment = f'''<article class="article privacy-article">
  <h1>{copy["title"]}</h1>
  <p class="lead">{copy["intro"]}</p>
  <h2>{copy["controller_title"]}</h2>
  <p>{controller}</p>
  <h2>{copy["data_title"]}</h2>
  <ul>
{purposes}
  </ul>
  <p>{copy["voluntary"]}</p>
  <h2>{copy["access_title"]}</h2>
  <p>{copy["access"]}</p>
  <p><a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages">GitHub Pages</a> · <a href="https://openai.com/policies/privacy-policy/">OpenAI</a> · <a href="https://web3forms.com/privacy">Web3Forms</a> · <a href="https://privacy.microsoft.com/{microsoft}/privacystatement">Microsoft</a></p>
  <h2>{copy["retention_title"]}</h2>
  <p>{copy["retention"]}</p>
  <h2>{copy["cookies_title"]}</h2>
  <p>{copy["cookies"]}</p>
  <h2>{copy["rights_title"]}</h2>
  <p>{copy["rights"]} <a href="https://uodo.gov.pl/pl/83" hreflang="pl">{copy["authority"]}</a></p>
  <section id="kontakt" aria-labelledby="privacy-contact-title">
    <h2 id="privacy-contact-title">{copy["contact_title"]}</h2>
    <form class="blog-form" data-endpoint="privacy" method="post">
      <label>{copy["email"]} <input type="email" name="email" maxlength="254" autocomplete="email" required></label>
      <label>{copy["message"]} <textarea name="description" minlength="8" maxlength="800" rows="5" required></textarea></label>
      <label class="consent"><input type="checkbox" name="consent" required> {copy["consent"]}</label>
      <div class="form-trap" aria-hidden="true"><input name="website" aria-label="Website" tabindex="-1" autocomplete="off"></div>
      <button type="submit">{copy["send"]}</button><p role="status"></p>
    </form>
  </section>
</article>'''
    index = list(LANGUAGES).index(code)
    form_copy = {key: forum.COPY[key][index] for key in ("posting", "saved", "sendError")}
    form_copy["preview"] = PRIVACY[code]["preview"]
    script_data = json.dumps(form_copy, ensure_ascii=False).replace("<", "\\u003c")
    script = f'<script type="application/json" id="forum-copy">{script_data}</script>\n'
    script += '<script src="../blog.js?v=privacy-1" defer></script>'
    article_page(code, "prywatnosc.html", PRIVACY[code]["title"], fragment, script)


def installation_page(code):
    copy = INSTALLATION[code]
    guide = next(topic for topic in forum.TOPICS["instalacja"] if topic.get("guide"))
    prefix = "" if code == "pl" else "../"
    language_screen = screenshot(code, "language", prefix, frame="installation-screen")

    def figure(asset, label, width, height):
        path = f"{prefix}media/instalacja-{asset}.webp"
        return (
            f'<figure class="localized-shot"><a href="{path}">'
            f'<img src="{path}" width="{width}" height="{height}" alt="{escape(copy[label + "_alt"])}" loading="lazy"></a>'
            f'<figcaption>{escape(copy[label + "_caption"])}</figcaption></figure>'
        )

    cable = figure("przewod-usb-a", "cable", 1536, 1024)
    closed_cover = figure("klapka-serwisowa", "cover", 1785, 2728)
    open_cover = figure("gniazda-usb", "ports", 1891, 2722)
    step_media = {
        2: f'<div class="installation-ports">{closed_cover}{open_cover}</div>',
        len(copy["steps"]): language_screen,
    }
    port_warning = f"""
      <aside class="installation-port-warning" aria-labelledby="port-warning-title">
        <strong id="port-warning-title">{escape(copy["port_warning_title"])}</strong>
        <p>{escape(copy["port_warning_check"])}</p>
        <p>{escape(copy["port_warning_damage"])}</p>
      </aside>"""
    requirements = "\n".join(f"<li>{escape(check)}</li>" for check in copy["checks"])
    steps = "\n".join(
        f'<li id="krok-{index}"><h3>{escape(title)}</h3>'
        f'{port_warning if index == 2 else ""}<p>{escape(body)}</p>'
        f'{step_media.get(index, "")}</li>'
        for index, (title, body) in enumerate(copy["steps"], start=1)
    )
    fragment = f"""
    <article class="history-article installation-guide">
      <h1>{escape(copy["title"])}</h1>
      <p class="lead">{escape(copy["intro"])}</p>
      <section>
        <h2>{escape(copy["requirements"])}</h2>
        <ul>{requirements}</ul>
        <div class="installation-cable">
          <div>
            <h3>{escape(copy["cable_title"])}</h3>
            <p>{escape(copy["cable"])}</p>
          </div>
          {cable}
        </div>
        <p>{escape(copy["other_models"])}</p>
        <p><a href="spolecznosc.html#sprzet">{escape(copy["test_device"])}</a></p>
      </section>
      <section>
        <h2>{escape(copy["steps_title"])}</h2>
        <ol class="installation-steps">{steps}</ol>
      </section>
      <section class="installation-help">
        <h2>{escape(copy["help_title"])}</h2>
        <p>{escape(copy["help"])}</p>
        <a class="btn" href="spolecznosc.html#instalacja/wpis-{guide["id"]}">{escape(copy["discussion"])}</a>
      </section>
    </article>"""
    article_page(code, "instalacja.html", copy["title"], fragment)


def article_page(code, filename, title, fragment, script=""):
    polish = code == "pl"
    copy = {"home": "Strona główna", "forum": "Forum"} if polish else HISTORY[code]
    commentary = CONTENT[code]
    prefix = "" if polish else "../"
    directory = DOCS if polish else DOCS / code
    history_title = "Historia projektu" if polish else PROJECT[code]["history"]
    update_target = "aktualizacje.html" if polish else "index.html#updates"
    footer = commentary.get("footer", "Lidlomix Pro to autorski, niezależny projekt Beniamina Żaka. Nazwy Lidl, Monsieur Cuisine i SilverCrest należą do ich właścicieli.")
    article_title = escape(title)
    social = f"{PAGE_URL}media/jezyki/{code}/programs.webp"
    canonical = f"{PAGE_URL}{'' if polish else code + '/'}{filename}"
    nav = choose_language(code, prefix, filename=filename)
    is_history = filename in HISTORY_PAGES
    back_target = "index.html#wpisy" if is_history else "index.html"
    back_label = escape(copy["back"] if is_history else copy["home"])
    (directory / filename).write_text(f'''<!doctype html>
<html lang="{code}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{article_title} · Lidlomix Pro">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{article_title} · Lidlomix Pro">
  <meta property="og:image" content="{social}">
  <meta property="og:url" content="{canonical}">
  <link rel="canonical" href="{canonical}">
  {alternates(filename)}
  <link rel="stylesheet" href="{prefix}styl.css?v=naglowki-2">
  <link rel="stylesheet" href="{prefix}languages.css?v=installation-3">
  <title>{article_title} · Lidlomix Pro</title>
</head>
<body class="localized-site history-page">
<a class="localized-skip" href="#content">{escape(commentary.get("skip", "Przejdź do treści"))}</a>
<header class="localized-header">
  <div class="wrap"><a class="brand" href="index.html">Lidlomix <b>Pro</b></a>
    <nav class="localized-nav">
      <a href="index.html">{escape(copy["home"])}</a>
      <a href="index.html#wpisy">{escape(history_title)}</a>
      <a href="{update_target}">{escape(commentary["nav"][1])}</a>
      <a href="spolecznosc.html">{escape(copy["forum"])}</a>
    </nav>
  </div>
  {nav}
</header>
<main class="wrap" id="content">
  <div class="history-article-nav"><a href="{back_target}">← {back_label}</a></div>

  {fragment.strip()}
</main>
<footer><div class="wrap site-footer">
  <p>{escape(footer)}</p>
  <div><a href="{REPOSITORY}">GitHub</a> · <a href="prywatnosc.html">{escape(commentary.get("privacy", "Polityka prywatności"))}</a></div>
</div></footer>
{script}
</body>
</html>
''', encoding="utf-8", newline="\n")


def localized_page(code):
    data = CONTENT[code]
    intro = escape(data["intro"])
    tagline = escape(data["tagline"])
    title = f"Lidlomix Pro · {LANGUAGES[code]}"
    canonical = f"{PAGE_URL}{code}/"
    social = f"{PAGE_URL}media/jezyki/{code}/programs.webp"
    nav = "\n".join(
        f'<a href="#{anchor}">{escape(label)}</a>'
        for label, anchor in zip(data["nav"], ("features", "updates", "gallery", "contact"), strict=True)
    )
    forum_title = forum.COPY["title"][list(LANGUAGES).index(code)]
    project = PROJECT[code]
    features = []
    for index, (title, description) in enumerate(data["features"]):
        assistant = f' <a href="#lidlomix-chatgpt">{escape(project["assistant"])}</a>' if index == 3 else ""
        features.append(f'<article><h3>{escape(title)}</h3><p>{escape(description)}{assistant}</p></article>')
    feature_cards = "\n".join(features)
    gallery = "\n".join(screenshot(code, shot, "../") for shot in
                        ("catalog", "cards", "steam", "peeler", "scale", "language", "updates"))
    local_file = DOCS / code / "index.html"
    local_file.parent.mkdir(exist_ok=True)
    local_file.write_text(f'''<!doctype html>
<html lang="{code}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="{intro}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{escape(title)}">
  <meta property="og:description" content="{intro}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{social}">
  <link rel="canonical" href="{canonical}">
  {alternates()}
  <link rel="stylesheet" href="../styl.css?v=naglowki-2">
  <link rel="stylesheet" href="../languages.css?v=history-1">
  <script src="../project.js" defer></script>
  <title>{escape(title)}</title>
</head>
<body class="localized-site">
<a class="localized-skip" href="#content">{escape(data["skip"])}</a>
<header class="localized-header">
  <div class="wrap"><a class="brand" href="index.html">Lidlomix <b>Pro</b></a>
  <nav class="localized-nav"><a href="#wpisy">{escape(project["history"])}</a>
  {nav}<a href="instalacja.html">{escape(INSTALLATION[code]["nav"])}</a><a href="spolecznosc.html">{escape(forum_title)}</a></nav></div>
  {choose_language(code, "../")}
</header>
<main id="content" class="wrap">
  <div class="flour-mark"><img src="../media/maka.webp" width="1280" height="428" alt="{escape(project["brand_alt"])}"></div>
  <section class="localized-hero">
    <div>
      <h1>{tagline}</h1>
      <p class="lead">{intro}</p>
      <div class="localized-actions">
        <a class="btn" href="#updates">{escape(data["primary"])}</a>
        <p class="demo-status">{escape(data["demo_status"])}</p>
      </div>
    </div>
    {screenshot(code, "programs", "../", eager=True, frame="localized-device")}
  </section>
  {assistant_card(code, "../")}
  {project_history(code)}
  <section class="localized-section" id="features">
    <h2>{escape(data["features_title"])}</h2>
    <div class="feature-grid">
      {feature_cards}
    </div>
  </section>
  {update(code, historical=True)}
  <section class="localized-section" id="gallery">
    <h2>{escape(data["gallery_title"])}</h2>
    <p class="localized-intro">{escape(data["gallery_intro"])}</p>
    <div class="localized-gallery">
      {gallery}
    </div>
  </section>
  <section class="localized-contact" id="contact">
    <div>
      <h2>{escape(data["nav"][3])}</h2>
      <p>{escape(data["contact_intro"])}</p>
    </div>
    <div class="contact-links">
      <a class="btn" href="spolecznosc.html">{escape(data["forum"])}</a>
      <a href="spolecznosc.html#kontakt">{escape(data["private_contact"])}</a>
    </div>
  </section>
</main>
<footer>
  <div class="wrap site-footer"><p>{escape(data["footer"])}</p>
    <div><a href="{REPOSITORY}">GitHub</a> · <a href="prywatnosc.html">{escape(data["privacy"])}</a></div>
  </div>
</footer>
</body>
</html>
''', encoding="utf-8", newline="\n")


def replace_generated(text, marker, source, insert_before):
    start = f"<!-- generated:{marker} -->"
    end = f"<!-- /generated:{marker} -->"
    block = f"{start}\n{source}\n{end}\n"
    if start in text:
        before, rest = text.split(start, 1)
        _, after = rest.split(end + "\n", 1)
        return before + block + after
    if insert_before not in text:
        raise ValueError(f"Cannot locate {marker} placement")
    return text.replace(insert_before, block + insert_before, 1)


def polish_page(path):
    source = path.read_bytes().decode("utf-8")
    newline = "\r\n" if "\r\n" in source else "\n"
    text = source.replace("\r\n", "\n")
    if path.name in HISTORY_PAGES:
        text = render_history_shots("pl", text)
    landing = path.name == "index.html"
    releases = path.name == "aktualizacje.html"
    text = re.sub(r'<dialog id="owner-panel".*?</dialog>\s*<script src="panel\.js[^"]*" defer></script>',
                  lambda _: forum.owner_panel().rstrip(), text, count=1, flags=re.S)
    head = '<link rel="stylesheet" href="languages.css?v=project-1">' if landing else '<link rel="stylesheet" href="languages.css">'
    if landing:
        head += '\n<script src="project.js" defer></script>\n' + alternates()
    if path.name == "prywatnosc.html":
        form_copy = {key: forum.COPY[key][0] for key in ("posting", "saved", "sendError")}
        form_copy["preview"] = "Podgląd lokalny. Wiadomość można wysłać z opublikowanej strony."
        local_copy = json.dumps(form_copy, ensure_ascii=False)
        head += f'\n<script type="application/json" id="forum-copy">{local_copy}</script>'
        text = text.replace('<form class="blog-form" data-endpoint="privacy">',
                            '<form class="blog-form" data-endpoint="privacy" method="post">')
    text = replace_generated(text, "languages-head", head, "</head>")
    anchor = "#updates" if releases else ""
    filename = path.name if path.name in HISTORY_PAGES or path.name == "prywatnosc.html" else "index.html"
    text = replace_generated(text, "languages-nav", choose_language("pl", anchor=anchor, filename=filename), "</header>")
    data = CONTENT["pl"]
    if landing:
        if 'href="instalacja.html"' not in text:
            before_forum = '<a href="spolecznosc.html">Forum</a>'
            text = text.replace(before_forum, f'<a href="instalacja.html">{escape(INSTALLATION["pl"]["nav"])}</a>{before_forum}', 1)
        if "<!-- generated:assistant-card -->" not in text:
            start = text.index('<section class="gpt-card"')
            end = text.index('</section>\n', start) + len('</section>\n')
            text = text[:start] + text[end:]
        text = replace_generated(text, "assistant-card", assistant_card("pl"), '<section class="section story-section"')
        summary = f'''
<section class="polish-latest">
  <div>
    <p class="localized-kicker">{escape(data["latest"])} · 0.19.9</p>
    <h2>{escape(data["update_title"])}</h2>
    <p>{escape(data["update_intro"])}</p>
    <a class="btn" href="{LATEST_PL}">Zobacz najnowsze zmiany</a>
  </div>
  {screenshot("pl", "programs", "")}
</section>'''.strip()
        text = replace_generated(text, "polish-latest", summary, '<!-- generated:assistant-card -->')
    if releases:
        gallery = "\n".join(screenshot("pl", shot, "") for shot in
                            ("catalog", "cards", "steam", "peeler", "scale", "language", "updates"))
        summary = f'''{update("pl")}
<section class="localized-section" id="zrzuty-0-19-9">
  <h2>{escape(data["gallery_title"])}</h2>
  <p>{escape(data["gallery_intro"])}</p>
  <div class="localized-gallery">{gallery}</div>
</section>'''
        text = replace_generated(text, "polish-update", summary, '<article class="community-panel release"')
    path.write_text(text, encoding="utf-8", newline=newline)


def readme():
    path = ROOT.parent / "README.md"
    text = path.read_text(encoding="utf-8")
    languages = " · ".join(f"[{name}]({PAGE_URL}{'' if code == 'pl' else code + '/'})"
                           for code, name in LANGUAGES.items())
    text = replace_generated(text, "readme-languages", f"**Języki / Languages**\n\n{languages}\n", "- [Czytaj blog]")
    path.write_text(text, encoding="utf-8", newline="\n")


def main():
    for path in sorted(DOCS.glob("*.html")):
        if path.name not in {"spolecznosc.html", "instalacja.html"}:
            polish_page(path)
    for index, code in enumerate(LANGUAGES):
        if code != "pl":
            localized_page(code)
            for filename in sorted(HISTORY_PAGES):
                history_page(code, filename)
            privacy_page(code)
        path = DOCS if code == "pl" else DOCS / code
        prefix = "" if code == "pl" else "../"
        page = forum.render(code, index, CONTENT[code], choose_language(code, prefix, filename="spolecznosc.html"),
                            alternates("spolecznosc.html"), REPOSITORY)
        (path / "spolecznosc.html").write_text(page, encoding="utf-8", newline="\n")
        installation_page(code)
    readme()


if __name__ == "__main__":
    main()
