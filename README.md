# Finance Lab

Site de révision de finance d'entreprise (SPA React), construit à partir du cours `finance.pdf`
(Corporate Finance, 513 diapositives). Fil rouge unique : **Adidas**. Bilingue français / anglais
(sélecteur FR / EN dans la barre latérale, choix mémorisé).

Chaque module suit la même structure en trois parties :

1. **Le concept** : 150 mots maximum, appliqués à Adidas.
2. **La boîte à outils** : les formules exactes du PDF (KaTeX), avec la page source.
3. **Le labo** : un simulateur interactif et un quiz.

## Lancer le projet

Prérequis : Node.js 24 ou plus récent.

```bash
npm install
npm run dev          # serveur de dev sur http://localhost:5173
npm run check:data   # recalcule tous les chiffres des JSON avec src/lib/finance.ts
npm run build        # vérification TypeScript + build de production
```

## Mise en ligne

Chaque envoi sur `main` déclenche `.github/workflows/deploy.yml` : vérification des données, lint, build
avec le préfixe `/<nom-du-dépôt>/`, puis publication sur GitHub Pages. `404.html` (copie de `index.html`)
permet d'ouvrir directement n'importe quelle page du site.

## Stack

React 19 + TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Recharts 3, Lucide React, KaTeX.

## Architecture

```
src/
├── main.tsx, App.tsx          Routeur : une route par module (chargée à la demande), les vues à 2 modules redirigent vers le 1er
├── index.css                  Tailwind + jetons d'interface (encre, statuts, encarts formule) + style des curseurs
├── i18n/                      Langue : LanguageProvider (FR/EN mémorisé), useCopy (textes d'interface), useContent (contenu traduit)
├── data/                      CONTENU : tout le texte et les chiffres vivent ici, jamais dans les composants
│   ├── en/                    Traductions anglaises, rangées par identifiant et superposées aux JSON français
│   ├── modules.json           4 vues, 6 modules : concept, boîte à outils, labo, mapping PDF → Adidas
│   ├── formulas.json          55 formules du PDF en LaTeX, avec symboles, règles d'interprétation et pages
│   ├── quiz.json              58 QCM (format examen : une bonne réponse, barème +1 / −1 / 0)
│   ├── adidas.json            Bilan et compte de résultat Adidas 2025 reclassés, 7 scénarios transposés, exercice « Guess which company »
│   ├── types.ts               Schéma typé des JSON
│   └── index.ts               Point d'entrée unique : getModule, getFormula, questionsFor
├── lib/
│   ├── finance.ts             Une fonction pure par formule (BFR, dette nette, ROCE, levier, WACC, NPV, IRR, payback…)
│   ├── balanceSheet.ts        Agrégats Adidas + colonnes du bilan (comptable, économique, emplois/ressources stables)
│   ├── chartTheme.ts          Palette catégorielle validée (daltonisme), couleur fixe par poste du bilan, chrome des graphiques
│   ├── chartTooltip.tsx       Infobulle commune des graphiques Recharts
│   ├── format.ts, tex.ts      Formats fr-FR (M€, %, jours) et nombres prêts pour KaTeX
│   ├── measure.ts             Mesure de texte et de largeur (un libellé n'est affiché que s'il tient)
│   └── storage.ts             Meilleurs scores de quiz (localStorage, optionnel)
├── components/
│   ├── FormulaCard.tsx        Encart « Boîte à outils » : formule KaTeX, symboles, règle, page source
│   ├── QuizEngine.tsx         QCM : entraînement (correction immédiate) ou examen blanc (correction finale), raccourcis A–E
│   ├── InteractiveSlider.tsx  Curseur avec valeur formatée et repère « Adidas 2025 »
│   ├── BalanceSheetChart.tsx  Bilan en grandes masses : blocs proportionnels, infobulles, légende-tableau
│   ├── ChartLegend.tsx        Légende des graphiques
│   ├── layout/                AppLayout (sidebar + tiroir mobile), Sidebar, ModuleLayout (gabarit 3 parties)
│   └── ui/                    StatTile, ThresholdMeter, SegmentedControl, Toggle, Panel, Tex
├── labs/                      Un simulateur par `lab.kind` (registre dans labs/index.ts, chargement à la demande)
│   ├── BalanceSheetLab.tsx    Bilan comptable ↔ économique, jauge de solvabilité, exercice « à qui appartient ce bilan ? »
│   ├── PnlLab.tsx             Cascade CA → résultat net, point mort, pop-up store (résultat ≠ trésorerie)
│   ├── WcrLab.tsx             Délais clients / stocks / fournisseurs + croissance → BFR, trésorerie nette, cycle d'exploitation
│   ├── LeverageLab.tsx        D et E → ROCE, kD, ROE en direct ; courbe ROE = f(gearing) ; marge × rotation
│   ├── WaccLab.tsx            WACC, cas A/B/C du cours, échelle des taux, goodwill/badwill, mode Modigliani-Miller
│   └── NpvLab.tsx             Projets Adidas et pièges de l'IRR, flux éditables, courbe NPV, IRR multiples, payback
└── pages/                     HomePage, ModulePage (formules + labo + quiz), QuizPage
scripts/check-data.ts          110 vérifications : équilibre du bilan, cascade du compte de résultat, ROE par le levier, corrigés du PDF,
                               traductions anglaises complètes
```

### Routes

| Vue | Route | Module | Labo |
| --- | --- | --- | --- |
| États financiers | `/financial-statements/balance-sheet` | Bilan (+ solvabilité) | Bilan comptable ↔ économique |
| | `/financial-statements/income-statement` | Compte de résultat | Cascade CA → résultat net, point mort |
| BFR & trésorerie | `/wcr` | BFR | Curseurs délais clients / stocks / fournisseurs |
| Rentabilité | `/profitability` | ROCE & ROE | Simulateur d'effet de levier |
| WACC & investissement | `/wacc-npv/wacc` | WACC | WACC et création de valeur (cas A/B/C) |
| | `/wacc-npv/npv-irr` | NPV & IRR | Flux, taux, courbe NPV, IRR, payback |
| | `/quiz` | Révision globale | QCM toutes questions, mode examen |

### Mapping PDF → Adidas

| Exemple du PDF | Transposition Adidas | Fidélité |
| --- | --- | --- |
| Pizza Food Truck | Pop-up store Adidas Originals | Montants ×10, IS 25 % |
| Fever Tech | Atelier d'assemblage de running | Volumes ×10, prix ÷10 : totaux identiques |
| Sociétés jumelles A / B | adidas.com (BFR < 0) / filiale wholesale (BFR > 0) | Chiffres identiques |
| WACC : 65 + 35 = 60 + 40, cas A/B/C | Adidas simplifié à 10 Md€ de capitaux employés | Chiffres identiques ÷10, en Md€ |
| Machine à 100 k€ | R&D d'une nouvelle semelle à 100 M€ | Chiffres identiques |
| Exercice 3 (extension d'usine) | Nouveau flagship store à 20 M€ | Chiffres identiques |
| Exercice 1 NPV (projets exclusifs) | Flagship à Shanghai / ligne padel | Chiffres identiques |

Les chiffres réels d'Adidas viennent du [rapport annuel 2025](https://report.adidas-group.com/2025/en/consolidated-financial-statements/consolidated-statement-of-financial-position.html),
reclassés dans la grille simplifiée du cours (voir `meta.disclaimer` dans `adidas.json`).

## Langues

- Les JSON français de `src/data` sont la source : chiffres, identifiants et textes français.
- `src/data/en/*.json` ne contient que les textes anglais, rangés par identifiant ; `src/i18n/content.ts` les superpose.
  Les formules anglaises reprennent le vocabulaire exact du PDF (lui-même en anglais).
- Les textes d'interface de chaque composant sont dans un objet `copy = { fr, en }` en tête de fichier.
- Les formats de nombres suivent la langue : `24 811 M€` / `€24,811m`, `51,6 %` / `51.6%`.
- `npm run check:data` échoue si un texte français n'a pas sa traduction.

## Hypothèses des simulateurs

- **BFR** : créances = délai clients × CA / 365 ; stocks et dettes fournisseurs = délai × coût des ventes / 365 ;
  les autres postes d'exploitation suivent l'activité. Immobilisations et ressources stables restent fixes.
- **Effet de levier** : D = dette nette + provisions et retraites (4 674 M€), pour que CE = E + D tombe juste.
  L'option « les prêteurs exigent plus » ajoute 2 points de taux par unité de gearing au-delà de 1 (illustration, pas une formule du cours).
- **Point mort** : le coût des ventes est traité comme variable, les charges opérationnelles et amortissements comme fixes.
- **WACC, mode Modigliani-Miller** : kE = ka + (ka − kD) × D/E, la formule du levier (p. 291) appliquée aux taux exigés.
