// 「まとめ」の画面：1つの話題を読む。
// どの話題を出すかは、住所の末尾（?id=muki-tenkan）で決まる。

const まとめの場所 = document.getElementById("まとめ本体");

戻るを直前の画面にする();
画面を作る();

// 「戻る」は、今日から来たら今日へ、辞典から来たら辞典へ帰す。
// このアプリの中から来たときだけ「1つ前に戻る」を使い、
// それ以外（住所を直接ひらいたとき など）は「今日」へ行く。
function 戻るを直前の画面にする() {
  const アプリの中から来た = document.referrer.indexOf(location.origin) === 0;
  if (!アプリの中から来た) {
    return;
  }
  document.getElementById("戻る").addEventListener("click", function (出来事) {
    出来事.preventDefault();
    history.back();
  });
}

async function 画面を作る() {
  try {
    const まとめ一覧 = await まとめ一覧を読む();

    const 指定されたid = new URLSearchParams(location.search).get("id");
    const まとめ = まとめ一覧.find(function (件) {
      return 件.id === 指定されたid;
    }) || まとめ一覧[0];

    見出しを作る(まとめ);

    まとめの場所.textContent = "";
    まとめの場所.appendChild(今どうなっているか(まとめ));
    まとめの場所.appendChild(これまでの経緯(まとめ));
    まとめの場所.appendChild(問題へのボタン());
  } catch (エラー) {
    失敗を伝える(まとめの場所, エラー);
  }
}

// 画面の上の紺の帯（話題名と、ジャンルなどの情報）
function 見出しを作る(まとめ) {
  document.title = まとめ.話題名;
  document.getElementById("話題名").textContent = まとめ.話題名;

  const 情報 = document.getElementById("見出しの情報");
  情報.textContent = "";
  情報.appendChild(document.createTextNode(まとめ.ジャンル + " ／ "));
  if (まとめ.大学に関係あり) {
    情報.appendChild(要素("span", "univ-mark", "大学に関係あり"));
    情報.appendChild(document.createTextNode(" ／ "));
  }
  情報.appendChild(document.createTextNode("収録 " + まとめ.収録件数 + "件"));
}

function 今どうなっているか(まとめ) {
  const 囲み = 要素("section", "block");
  囲み.appendChild(要素("h2", null, "今どうなっているか"));
  囲み.appendChild(文章の段落("summary", まとめ.今どうなっているか));

  // 施行日や期限は、決まっている話題にだけ出す
  const 日付の文 = [];
  if (まとめ.施行日) {
    日付の文.push("施行日：" + 読める日付(まとめ.施行日));
  }
  if (まとめ.期限) {
    日付の文.push((まとめ.期限の名前 || "期限") + "：" + 読める日付(まとめ.期限));
  }
  if (日付の文.length > 0) {
    囲み.appendChild(要素("p", "screen-meta", 日付の文.join(" ／ ")));
  }

  return 囲み;
}

function これまでの経緯(まとめ) {
  const 囲み = 要素("section", "block");
  囲み.appendChild(要素("h2", null, "これまでの経緯"));

  const 並び = 要素("ul", "history");
  まとめ.経緯.forEach(function (出来事) {
    const 行 = 要素("li");
    行.appendChild(要素("p", "history-date", 日付を読みやすく(出来事.日付)));
    行.appendChild(要素("p", null, 出来事.一文));
    行.appendChild(出典の行(出来事.出典));
    並び.appendChild(行);
  });
  囲み.appendChild(並び);

  return 囲み;
}

function 問題へのボタン() {
  const 行 = 要素("p", "next-action");
  const リンク = 要素("a", null, "この話題の問題を解く");
  リンク.href = "quiz.html";
  行.appendChild(リンク);
  return 行;
}

// "2027-04-01" は読みやすい形に、"未定" はそのまま出す
function 読める日付(値) {
  return /^\d{4}-\d{2}-\d{2}$/.test(値) ? 日付を読みやすく(値) : 値;
}
