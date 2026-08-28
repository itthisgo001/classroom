const PROTECTED = {
  "/aws": "AWS_PASSWORD",
};

function getCourse(pathname) {
  return Object.keys(PROTECTED).find(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix + "/")
  );
}

function loginPage(course, error = "") {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>수업 자료 인증</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;

      display: flex;
      align-items: center;
      justify-content: center;

      font-family:
        Pretendard,
        "Noto Sans KR",
        "Malgun Gothic",
        sans-serif;

      background: #f5f7fb;
    }

    .login-box {
      width: 400px;
      max-width: calc(100% - 32px);

      padding: 36px;

      background: white;

      border-radius: 20px;

      box-shadow:
        0 20px 50px
        rgba(0,0,0,0.12);
    }

    h1 {
      margin-top: 0;
    }

    p {
      color: #667085;
    }

    input {
      width: 100%;

      padding: 14px;

      margin: 10px 0 14px;

      border: 1px solid #d0d5dd;

      border-radius: 10px;

      font-size: 16px;
    }

    button {
      width: 100%;

      padding: 14px;

      border: 0;

      border-radius: 10px;

      background: #3457d5;

      color: white;

      font-weight: bold;

      font-size: 16px;

      cursor: pointer;
    }

    .error {
      color: #b42318;
    }
  </style>

</head>

<body>

  <form
    class="login-box"
    method="POST"
  >

    <h1>수업 자료 인증</h1>

    <p>
      <strong>${course}</strong>
      수업 자료입니다.
    </p>

    ${error
      ? `<p class="error">${error}</p>`
      : ""
    }

    <input
      type="password"
      name="password"
      placeholder="수업 비밀번호"
      required
      autofocus
    >

    <button type="submit">
      자료실 접속
    </button>

  </form>

</body>
</html>
`;
}

async function sha256(text) {

  const data =
    new TextEncoder().encode(text);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return [...new Uint8Array(hash)]
    .map(
      b =>
        b.toString(16)
          .padStart(2, "0")
    )
    .join("");
}

async function validCookie(
  request,
  course,
  password
) {

  const cookies =
    request.headers.get("Cookie") || "";

  const cookieName =
    `class_${course.slice(1)}`;

  const expected =
    await sha256(
      `${course}:${password}`
    );

  return cookies
    .split(";")
    .some(
      item =>
        item.trim() ===
        `${cookieName}=${expected}`
    );
}

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);

    const course =
      getCourse(url.pathname);

    // 보호 대상이 아니면
    // 정적 파일 그대로 반환
    if (!course) {

      return env.ASSETS.fetch(request);

    }

    const secretName =
      PROTECTED[course];

    const password =
      env[secretName];

    if (!password) {

      return new Response(
        "Password secret is not configured.",
        {
          status: 500
        }
      );

    }

    // 이미 인증된 경우
    if (
      await validCookie(
        request,
        course,
        password
      )
    ) {

      return env.ASSETS.fetch(request);

    }

    // 로그인 처리
    if (
      request.method === "POST"
    ) {

      const form =
        await request.formData();

      const submitted =
        String(
          form.get("password") || ""
        );

      if (
        submitted === password
      ) {

        const value =
          await sha256(
            `${course}:${password}`
          );

        const cookieName =
          `class_${course.slice(1)}`;

        return new Response(
          null,
          {
            status: 303,

            headers: {

              "Location":
                url.pathname,

              "Set-Cookie":
                `${cookieName}=${value}; ` +
                `Path=${course}/; ` +
                `HttpOnly; ` +
                `Secure; ` +
                `SameSite=Lax; ` +
                `Max-Age=28800`

            }
          }
        );

      }

      return new Response(

        loginPage(
          course,
          "비밀번호가 올바르지 않습니다."
        ),

        {
          status: 401,

          headers: {
            "Content-Type":
              "text/html; charset=UTF-8"
          }
        }

      );

    }

    // 최초 접속
    return new Response(

      loginPage(course),

      {
        status: 401,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        }
      }

    );

  }

};