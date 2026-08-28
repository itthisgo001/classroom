const PROTECTED = {
  "/aws": "AWS_PASSWORD",
  "/security": "SECURITY_PASSWORD",
  "/kubernetes": "K8S_PASSWORD",
  "/cyber": "CYBER_PASSWORD",
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

    const response =
        await env.ASSETS.fetch(request);

    if (response.status === 404) {

        return new Response(
            notFoundPage(url.pathname),
            {
                status: 404,

                headers: {
                    "Content-Type":
                        "text/html; charset=UTF-8"
                }
            }
        );

    }

    return response;
}

    const secretName =
      PROTECTED[course];

    const password =
      env[secretName];

    if (!password) {

    return new Response(
        unavailablePage(course),
        {
            status: 200,

            headers: {
                "Content-Type":
                    "text/html; charset=UTF-8"
            }
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

        const response =
            await env.ASSETS.fetch(request);

        if (response.status === 404) {

            return new Response(
                notFoundPage(url.pathname),
                {
                    status: 404,

                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8"
                    }
                }
            );

        }

        return response;
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

// 에러 페이지
function unavailablePage(course) {
    return `
<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>수업 자료 준비 중</title>

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
            color: #172033;
        }

        .box {
            width: min(
                460px,
                calc(100% - 32px)
            );

            padding: 40px;

            background: #fff;

            border:
                1px solid #e5e7eb;

            border-radius: 20px;

            box-shadow:
                0 18px 45px
                rgba(0, 0, 0, 0.08);

            text-align: center;
        }

        .icon {
            width: 72px;
            height: 72px;

            margin: 0 auto 20px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 20px;

            background: #eef2ff;

            font-size: 34px;
        }

        h1 {
            margin: 0 0 12px;

            font-size: 26px;
        }

        p {
            margin: 0;

            color: #667085;

            line-height: 1.7;
        }

        .course {
            margin-top: 20px;

            padding: 12px;

            border-radius: 10px;

            background: #f5f7fb;

            color: #3457d5;

            font-weight: 700;
        }

        a {
            display: inline-block;

            margin-top: 28px;

            padding: 12px 20px;

            border-radius: 10px;

            background: #3457d5;

            color: #fff;

            font-weight: 700;

            text-decoration: none;
        }

        a:hover {
            background: #2848bc;
        }
    </style>
</head>

<body>

    <main class="box">

        <div class="icon">
            📚
        </div>

        <h1>
            수업 자료 준비 중입니다
        </h1>

        <p>
            현재 이 과정의 자료는
            아직 공개되지 않았습니다.
        </p>

        <p>
            수업 진행 시 다시 접속해주세요.
        </p>

        <div class="course">
            ${course}
        </div>

        <a href="/">
            ← 전체 자료실로 돌아가기
        </a>

    </main>

</body>
</html>
`;
}

function notFoundPage(pathname) {
    return `
<!doctype html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>페이지 준비 중</title>

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
            color: #172033;
        }

        .box {
            width: min(
                480px,
                calc(100% - 32px)
            );

            padding: 40px;

            background: #fff;

            border:
                1px solid #e5e7eb;

            border-radius: 20px;

            box-shadow:
                0 18px 45px
                rgba(0, 0, 0, 0.08);

            text-align: center;
        }

        .icon {
            width: 72px;
            height: 72px;

            margin: 0 auto 20px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 20px;

            background: #eef2ff;

            font-size: 34px;
        }

        h1 {
            margin: 0 0 12px;

            font-size: 26px;
        }

        p {
            margin: 6px 0;

            color: #667085;

            line-height: 1.7;
        }

        .path {
            margin-top: 20px;

            padding: 12px;

            border-radius: 10px;

            background: #f5f7fb;

            color: #3457d5;

            font-weight: 700;

            word-break: break-all;
        }

        a {
            display: inline-block;

            margin-top: 28px;

            padding: 12px 20px;

            border-radius: 10px;

            background: #3457d5;

            color: #fff;

            font-weight: 700;

            text-decoration: none;
        }

        a:hover {
            background: #2848bc;
        }
    </style>
</head>

<body>

    <main class="box">

        <div class="icon">
            🚧
        </div>

        <h1>
            아직 준비 중인 페이지입니다
        </h1>

        <p>
            해당 과목 페이지는 아직 생성되지 않았습니다.
        </p>

        <p>
            자료가 준비되면 순차적으로 공개됩니다.
        </p>

        <div class="path">
            ${pathname}
        </div>

        <a href="/">
            ← 전체 자료실로 돌아가기
        </a>

    </main>

</body>
</html>
`;
}