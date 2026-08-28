# Cloudflare Pages 수업 자료실

- `/` 공개
- `/aws/`, `/security/`, `/kubernetes/` 비밀번호 보호

## 배포
1. GitHub 저장소에 push
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. Framework preset: None
4. Build command: 비움
5. Build output directory: `/`
6. Deploy

## Secrets
Pages 프로젝트 → Settings → Variables and Secrets 에 Secret 타입으로 등록:
- AWS_PASSWORD
- SECURITY_PASSWORD
- K8S_PASSWORD

## Notion 링크
각 과목 index.html의 https://www.notion.so/ 를 실제 Notion 공개 링크로 교체.

쿠키 유지시간은 8시간(Max-Age=28800).
