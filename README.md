# Finance Lab

Site de révision de finance d'entreprise (SPA React), construit à partir du cours `finance.pdf`
(Corporate Finance, 513 diapositives). Fil rouge unique : **Adidas**. Bilingue français / anglais
(sélecteur FR / EN dans la barre latérale, choix mémorisé).

Chaque module suit la même structure en trois parties :

1. **Le concept** : 150 mots maximum, appliqués à Adidas.
2. **La boîte à outils** : les formules exactes du PDF (KaTeX), avec la page source.
3. **Le labo** : un simulateur interactif et un quiz. Les modules 7 à 11 ajoutent des **missions** (défis à relever
   dans le simulateur, mémorisés localement et affichés sur la page d'accueil).

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
│   ├── modules.json           8 vues, 11 modules : concept, boîte à outils, labo, mapping PDF → Adidas
│   ├── formulas.json          77 formules du PDF en LaTeX, avec symboles, règles d'interprétation et pages
│   ├── quiz.json              105 QCM (format examen : une bonne réponse, barème +1 / −1 / 0)
│   ├── adidas.json            Bilan, compte de résultat et tableau des flux Adidas 2025 reclassés, données boursières,
│   │                          13 scénarios transposés, exercice « Guess which company »
│   ├── types.ts               Schéma typé des JSON
│   └── index.ts               Point d'entrée unique : getModule, getFormula, questionsFor
├── lib/
│   ├── finance.ts             Une fonction pure par formule (BFR, dette nette, ROCE, levier, WACC, NPV, IRR, payback, flux de
│   │                          trésorerie, DCF et Gordon-Shapiro, futures et options, levée de fonds, liquidation…)
│   ├── balanceSheet.ts        Agrégats Adidas + colonnes du bilan (comptable, économique, emplois/ressources stables)
│   ├── chartTheme.ts          Palette catégorielle validée (daltonisme), couleur fixe par poste du bilan, chrome des graphiques
│   ├── chartTooltip.tsx       Infobulle commune des graphiques Recharts
│   ├── format.ts, tex.ts      Formats fr-FR (M€, %, jours) et nombres prêts pour KaTeX
│   ├── measure.ts             Mesure de texte et de largeur (un libellé n'est affiché que s'il tient)
│   └── storage.ts             Meilleurs scores de quiz et missions accomplies (localStorage, optionnel)
├── components/
│   ├── FormulaCard.tsx        Encart « Boîte à outils » : formule KaTeX, symboles, règle, page source
│   ├── QuizEngine.tsx         QCM : entraînement (correction immédiate) ou examen blanc (correction finale), raccourcis A–E
│   ├── InteractiveSlider.tsx  Curseur avec valeur formatée et repère « Adidas 2025 »
│   ├── BalanceSheetChart.tsx  Bilan en grandes masses : blocs proportionnels, infobulles, légende-tableau
│   ├── ChartLegend.tsx        Légende des graphiques
│   ├── WaterfallChart.tsx     Cascade générique (soldes et flux), utilisée pour le tableau des flux et le pont VE → capitaux propres
│   ├── GaugeChart.tsx         Jauge semi-circulaire à seuils (vert / orange / rouge), verdict écrit et icône
│   ├── MissionBoard.tsx       Missions d'un labo : progression, leçon débloquée, badge
│   ├── layout/                AppLayout (sidebar + tiroir mobile), Sidebar, ModuleLayout (gabarit 3 parties)
│   └── ui/                    StatTile, ThresholdMeter, SegmentedControl, Toggle, Panel, Tex
├── labs/                      Un simulateur par `lab.kind` (registre dans labs/index.ts, chargement à la demande)
│   ├── BalanceSheetLab.tsx    Bilan comptable ↔ économique, jauge de solvabilité, exercice « à qui appartient ce bilan ? »
│   ├── PnlLab.tsx             Cascade CA → résultat net, point mort, pop-up store (résultat ≠ trésorerie)
│   ├── WcrLab.tsx             Délais clients / stocks / fournisseurs + croissance → BFR, trésorerie nette, cycle d'exploitation
│   ├── LeverageLab.tsx        D et E → ROCE, kD, ROE en direct ; courbe ROE = f(gearing) ; marge × rotation
│   ├── WaccLab.tsx            WACC, cas A/B/C du cours, échelle des taux, goodwill/badwill, mode Modigliani-Miller
│   ├── NpvLab.tsx             Projets Adidas et pièges de l'IRR, flux éditables, courbe NPV, IRR multiples, payback
│   ├── CashFlowLab.tsx        EBITDA → CFO → FCFF (→ variation de trésorerie) selon les délais et les CAPEX ; vrai tableau 2025 + questions ENGIE
│   ├── SolvencyLab.tsx        Rachat financé par dette : jauges dette nette / EBITDA, ressources stables / CE, dette nette / CFO ; Europcar
│   ├── ValuationLab.tsx       Mini-DCF Adidas (WACC, g), courbe et matrice de sensibilité, multiples, BUY / HOLD / SELL ; cas Crit
│   ├── HedgingLab.tsx         Couverture du caoutchouc : future ou call, coût net, appels de marge, profils de gain
│   ├── FundraisingLab.tsx     Levée de fonds Stride Lab (camembert, bilan avant / après, courbe en J) ; liquidation et ordre de priorité
│   └── gaugeZones.ts          Grilles du cours pour les jauges (dette nette / EBITDA, dette nette / CFO, ressources stables / CE)
└── pages/                     HomePage, ModulePage (formules + labo + quiz), QuizPage
scripts/check-data.ts          179 vérifications : équilibre du bilan, cascade du compte de résultat, tableau des flux 2025, ROE par le levier,
                               DCF, corrigés du PDF (ENGIE, Europcar, Crit, Terna, cuivre, Heineken, start-up), traductions anglaises complètes
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
| Cash & solvabilité | `/cash-solvency/cash-flow` | Tableau des flux de trésorerie | Cascade EBITDA → FCFF, vrai tableau 2025 |
| | `/cash-solvency/solvency` | Solvabilité | Rachat financé par dette, jauges de solvabilité |
| Valorisation | `/valuation` | Valorisation (DCF, multiples) | Mini-DCF, sensibilité WACC / g, BUY / HOLD / SELL |
| Finance de marché | `/market-finance` | Finance de marché & dérivés | Couverture du caoutchouc (future, call) |
| Start-up & restructuring | `/startup` | Start-up & restructuring | Levée de fonds, dilution, liquidation |
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
| Exercice ENGIE (tableau des flux 2015) | Vrai tableau des flux Adidas 2025, mêmes questions | Chiffres réels ; corrigé ENGIE vérifié |
| Exercice Europcar (solvabilité 2019) | Ratios réels d'Adidas, puis rachat fictif financé par dette | Europcar affiché tel quel |
| Exercice Crit (DCF, multiples, BUY / HOLD / SELL) | DCF d'Adidas au 31/12/2025 ; Crit rejouable tel quel | Chiffres identiques pour Crit |
| Future sur le cuivre, call Heineken | Future et call sur le caoutchouc d'Adidas | Volumes ×10, prix ÷4 ; prime ≈ 5 % du prix d'exercice |
| Start-up : 10 k€ de capital, 90 k€ levés, POST 202,5 k€ | Stride Lab, start-up interne fictive | Montants ×1 000, mêmes pourcentages |

Les chiffres réels d'Adidas viennent du [rapport annuel 2025](https://report.adidas-group.com/2025/en/consolidated-financial-statements/consolidated-statement-of-financial-position.html)
(bilan, compte de résultat, [tableau des flux](https://report.adidas-group.com/2025/en/consolidated-financial-statements/consolidated-statement-of-cash-flows.html),
[données boursières](https://report.adidas-group.com/2025/en/to-our-shareholders/our-share.html)), reclassés dans la grille simplifiée du cours
(voir `meta.disclaimer` et `meta.cashFlowNote` dans `adidas.json`).

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
- **Tableau des flux, simulateur** : une année d'activité identique à 2025 ; impôt calculé sur l'EBIT (présentation « puriste », p. 223) ;
  ΔBFR mesuré par rapport au bilan du 31/12/2025 avec les règles du labo BFR. Financement : intérêts 2025 nets d'impôt,
  dividende proposé (2,80 € par action), loyers remboursés au niveau de 2025.
- **Solvabilité** : le prix payé s'ajoute aux capitaux employés ; la cible apporte prix / multiple d'EBITDA et le convertit en CFO
  au rythme d'Adidas. Une dette long terme est une ressource stable, un crédit-relais de la trésorerie passive.
  CFO « normatif » = EBITDA − impôt sur l'EBIT (BFR stable).
- **Valorisation** : FCFF normatif 2025 = EBITDA − impôt sur l'EBIT − CAPEX ; sur 5 ans, EBITDA, impôt, CAPEX et BFR croissent au même
  rythme (la hausse du BFR consomme du cash), puis croissance perpétuelle g. Capitaux propres = VE − dette nette (loyers compris,
  minoritaires ignorés), divisés par les actions en circulation. BUY / SELL au-delà de ±10 % du cours : convention du labo.
- **Dérivés** : pas de valeur temps ni de coûts de transaction (raisonnement à l'échéance, comme le cours) ; les appels de marge
  cumulés valent Q × (p − F).
- **Start-up** : le nombre d'actions nouvelles n'est pas arrondi ; la courbe en J reprend l'allure du schéma p. 459 (illustrative).
