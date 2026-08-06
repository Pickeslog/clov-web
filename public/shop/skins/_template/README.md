# Mascot shop skin template

상점에서 구매·장착하는 마스코트 스킨은 다음 경로를 사용한다.

```text
public/shop/skins/<mascot-id>/<skin-id>/
  default.png
  angry.png
  dizzy.png
  find.png
  pencil.png
  pulled.png
  scared.png
  sleepy.png
  smile.png
  metadata.json
```

- `mascot-id`, `skin-id`: kebab-case
- 9개 상태 PNG: 640×640 RGBA, 투명 배경, 전신과 부속 효과가 잘리지 않아야 한다.
- 상태와 파일명은 `src/assets/mascot/_template` 계약을 그대로 따른다.
- 기존 마스코트의 핵심 실루엣을 유지하고 작은 상점 카드에서도 스킨을 구분할 수 있어야 한다.
- `metadata.json`: 에셋 인벤토리와 DB 등록을 위한 메타데이터다. 런타임에서 직접 읽지는 않는다.
- 현재 서버는 장착 가능한 아이템을 `COSTUME`으로 검증하므로, UI에서 스킨으로 부르더라도
  `shopCategory`는 `COSTUME`을 사용한다.
- DB `shop_items.image_url`에는 `/shop/skins/<mascot-id>/<skin-id>/default.png`를 저장한다.

가격과 판매 기간은 에셋 메타데이터가 아니라 서버의 `shop_items` 데이터에서 관리한다.
