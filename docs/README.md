# Docs Overview

この `docs` ディレクトリは、Kyoiru（今日いる）開発の最小運用セットです。  
仕様、設計、実装計画、未確定事項、レビュー基準を 5 本に集約し、更新箇所を増やしすぎないことを優先します。

## 1. 基本文書

- `docs/product/source-spec.md`
  - プロダクト仕様の単一ソース
- `docs/architecture.md`
  - 技術方針、構成、API 境界、権限制御、データモデルの集約
- `docs/planning/implementation-plan.md`
  - 実装順序、依存関係、直近着手順の管理
- `docs/open/open-questions.md`
  - 未確定事項だけを分離して管理
- `docs/review.md`
  - レビュー観点と主要フロー受け入れ条件を集約

補助文書:
- `docs/decisions/*.md`
  - 後から覆しにくい技術判断だけを ADR として残す

## 2. 運用ルール

- 仕様変更は `docs/product/source-spec.md` を先に更新する
- 設計変更は `docs/architecture.md` に集約する
- 実装順や優先順位の変更は `docs/planning/implementation-plan.md` に集約する
- 未確定事項は `docs/open/open-questions.md` にのみ置く
- レビュー観点や受け入れ条件は `docs/review.md` に集約する
- 小粒な機能別 md は増やさない

## 3. 作業順序

1. `source-spec.md` を確認する
2. 未確定事項があれば `open-questions.md` を確認する
3. 設計判断が必要なら `architecture.md` を確認する
4. 実装順序は `implementation-plan.md` を確認する
5. 実装前とレビュー時に `review.md` を確認する
6. 技術判断が後で参照されるなら ADR を追加する

## 4. 崩してはいけない前提

- 無料版は最後まで「軽いつながり」が主役
- 有料版は「安心強化」であり、無料版を監視アプリ化しない
- LINE ログイン / LINE 共有は日本向け導線として優先
- block 済み相手への接触経路は厳格に遮断
- JST 朝 6:00 基準を崩さない
- 見守りは相手の明示同意完了まで有効化扱いにしない
