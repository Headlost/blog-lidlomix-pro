# Kolejne wpisy

1. Skopiuj jeden z plików wpisu w `docs`. Zmień tytuł, opis, datę, numer i adres w metadanych. Pisz o tym, co zmieniła wersja, jak ją sprawdzono i co zostało do próby. Dodaj kartę wpisu na początku listy w `docs/index.html`.
2. Nowy wątek komentarzy załóż w Issues. W sekcji komentarzy wpisz jego numer w `data-issue` i zmień adres przycisku. Strona pokazuje do 20 pierwszych komentarzy; całość jest w wątku. Komentarze i zgłoszenia wymagają konta GitHub.
3. Aby dodać film, wstaw blok poniżej do wpisu i podmień identyfikator na 11 znaków z adresu YouTube. Film ładuje się dopiero po kliknięciu. Dodaj też link do filmu w sekcji Filmy na stronie głównej.
4. Zrzuty przechowuj w `docs/media`. Przed publikacją sprawdź, czy nie widać danych konta, nazwy sieci ani identyfikatorów robota. Zdjęcie facebook.webp pochodzi z rozmowy o poście. wybor.webp, start.webp i woda.webp przechwycono z urządzenia 13 listopada. tara.webp pochodzi z archiwum prób na robocie.
5. Zapis na listę odbywa się w osobnym wątku #1. Po przygotowaniu kolejnych prób możesz ogłosić ich zakres w tym wątku. Lista jest publiczna, więc nie proś tam o prywatne dane.

```html
<div class="video">
  <button type="button" data-youtube="ID_FILMU_11">Odtwórz pokaz</button>
  <p><a href="https://www.youtube.com/watch?v=ID_FILMU_11">Otwórz w YouTube</a></p>
</div>
```

Publikacja: GitHub Pages, gałąź main, katalog /docs.
