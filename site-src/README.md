# Wersje językowe bloga

Treści nowych wersji i najnowszy polski wpis znajdują się w `locales.json`. Po edycji uruchom `python -B site-src/build.py` w katalogu repozytorium. Skrypt odtwarza wersje językowe w `docs`, sekcje oznaczone komentarzami `generated` w polskich stronach oraz listę języków w `README.md`.

Teksty interfejsu forum są w `forum.json`, a przypięte tematy w `forum-topics.json`. Każda wersja korzysta ze wspólnych działów i domyślnie pokazuje wpisy użytkowników w wybranym języku. Identyfikatory przypiętych tematów są wspólne dla wszystkich języków i muszą odpowiadać identyfikatorom akceptowanym przez usługę forum.

Przewodnik instalacji USB i link do dyskusji w danym języku generowane są z `installation.json`.

Treść sekcji Lidlomix w ChatGPT i skróty historii projektu znajdują się w `project.json`.

Pełne teksty artykułów w pięciu dodatkowych językach znajdują się w `history/<kod>/`. Wspólne elementy nawigacji są w `history.json`. Znaczniki `history-shot` w tych artykułach i polskich stronach wskazują zrzut z folderu danego języka. Podpisy są w `history-shots.json` i `locales.json`. Po zmianie treści uruchom `python -B site-src/build.py`.

Tłumaczenia polityki prywatności i etykiety formularza są w `privacy.json`. Ich treść odpowiada polskiej stronie `docs/prywatnosc.html`.

Zrzuty z fizycznego Monsieur Cuisine Connect są w `docs/media/jezyki/<kod>`. W każdym języku prezentujemy to samo menu i te same funkcje. Ekran aktualizacji pokazuje kompilację używaną przy robieniu zrzutów.

Podgląd lokalny uruchom poleceniem `python -m http.server --bind 127.0.0.1 --directory docs 17864`.
