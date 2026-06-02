# ANT: Alive, Not Alone, Tomorrow matters

정적 단일 페이지 인터랙티브 작품입니다. `ArrowLeft` / `ArrowRight`로 캐릭터를 움직이고, 왼쪽 끝으로 떨어지면 `정말 원하십니까?` 선택이 나타납니다.

## 실행

브라우저에서 [index.html](./index.html)을 직접 열어도 되고, 간단한 정적 서버로 실행해도 됩니다.

```powershell
python -m http.server 4173
```

그 뒤 `http://localhost:4173`로 접속합니다.

## 플래시백 이미지 추가

낙하 중 스쳐 지나갈 사진을 아래 경로에 넣으면 자동으로 무작위 사용됩니다.

- `assets/flashbacks/photo-1.jpg`
- `assets/flashbacks/photo-2.jpg`
- `assets/flashbacks/photo-3.jpg`
- `assets/flashbacks/photo-4.jpg`
- `assets/flashbacks/photo-5.jpg`

해당 파일이 없으면 추상적인 색면 이미지로 대체됩니다.
