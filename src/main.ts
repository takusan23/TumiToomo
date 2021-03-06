import { GameMainParameterObject, RPGAtsumaruWindow } from "./parameterObject"
// 物理エンジン
import * as b2 from "@akashic-extension/akashic-box2d"
// 複数行表示に対応したLabelなど
import * as al from "@akashic-extension/akashic-label"

declare const window: RPGAtsumaruWindow

export function main(param: GameMainParameterObject): void {

	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: [
			"toomo", "kiyomizu", "n_kou", "result", "doutei_toomo", "inu", "gozyou", "korean", "kiyomizu", "rotate",
			// tslint:disable-next-line: max-line-length
			"doumo_toomo", "gogo_no_zyugyou", "hattastu_syougai", "karaoke_ikuka", "katsudon_channel", "korean_sound", "n_kou_taigaku", "san_ryuunen", "teacher_block", "kanemoti"
		]
	})

	let time = 70 // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 }

	/** 物体のオブジェクト */
	interface BodyObject {
		/** @param assetSrc アセット画像の名前。assetIdsに書かないと動かないよ */
		assetSrc: string
		/** @param sharpList 当たり判定の形状。 */
		sharpList: b2.Box2DWeb.Common.Math.b2Vec2[]
		/** @param bodyName 物体の名前。N高等学校など */
		bodyName: string
	}
	/** 生成した物体(Box2dとかentity)の配列 */
	const bodyList: b2.Box2DOptions.EBody[] = []

	/**
	 * この関数はタイトル用のSceneを生成します。
	 * @returns 生成したSceneです。
	 */
	const createTitleScene = (): g.Scene => {
		const titlescene = new g.Scene({
			game: g.game,
			// このシーンで利用するアセットのIDを列挙し、シーンに通知します
			assetIds: ["title"]
		})
		// 読み込んだら
		titlescene.loaded.add(() => {
			// タイトル画像を召喚します
			const titleImage = new g.Sprite({
				scene: titlescene,
				src: titlescene.assets["title"]
			})
			titlescene.append(titleImage)
		})
		return titlescene
	}
	// タイトル表示
	const titleScene = createTitleScene()
	g.game.pushScene(titleScene)
	// 5秒経過すればゲーム開始。
	titleScene.setTimeout(() => {
		scene.loaded.add(() => {
			// 5秒引いておく（タイトル表示時間）
			time -= 5
			const background = new g.FilledRect({ scene: scene, cssColor: "white", width: g.game.width, height: g.game.height })
			scene.append(background)

			// ここからゲーム内容を記述します

			// 物理エンジンの世界を生成する
			const worldOption = {
				gravity: [0, 9.8],
				scale: 50,
				sleep: true
			}
			const box = new b2.Box2D(worldOption)
			// 物理エンジンの世界を進める
			scene.update.add(() => {
				box.step(1 / g.game.fps)
			})

			// フォントの生成
			const font = new g.DynamicFont({
				game: g.game,
				fontFamily: g.FontFamily.SansSerif,
				size: 48
			})

			// スコア表示用のラベル
			const scoreLabel = new g.Label({
				scene: scene,
				text: "スコア: 0",
				font: font,
				fontSize: font.size / 2,
				textColor: "black"
			})
			scene.append(scoreLabel)

			// 残り時間表示用ラベル
			const timeLabel = new g.Label({
				scene: scene,
				text: "残り時間: 60秒",
				font: font,
				fontSize: font.size / 2,
				textColor: "black",
				x: 0.7 * g.game.width
			})
			scene.append(timeLabel)

			// 回転ボタン
			const rotateButton = new g.Sprite({
				scene: scene,
				src: scene.assets["rotate"],
				tag: "rotate" // 回転ボタンかどうか識別用。
			})
			// 位置調整
			rotateButton.x = g.game.width - rotateButton.width
			rotateButton.y = g.game.height - rotateButton.height - 50
			scene.append(rotateButton)
			// クリックイベントを使うためには「touchable」をtrueにしないといけないらしい。pointDownのドキュメントには書いてなかったぞおい
			rotateButton.touchable = true

			// 地面
			const base = new g.FilledRect({
				scene: scene,
				width: g.game.width,
				height: 10,
				cssColor: "black",
				y: (300)
			})
			scene.append(base)
			const floorFixDef = box.createFixtureDef({
				density: 1.0, // 密度
				friction: 0.5, // 摩擦係数
				restitution: 0.3, // 反発係数
				shape: box.createRectShape(base.width, base.height) // 形状
			})
			const floorDef = box.createBodyDef({
				type: b2.BodyType.Static
			})
			const floorBody = box.createBody(base, floorDef, floorFixDef)

			// 物体生成
			const nKou: BodyObject = {
				assetSrc: "n_kou",
				bodyName: "N高",
				sharpList: [
					box.vec2(25, -25),
					box.vec2(25, 25),
					box.vec2(-25, 25),
					box.vec2(-25, -25)
				]
			}
			const dt: BodyObject = {
				assetSrc: "doutei_toomo",
				bodyName: "DT",
				sharpList: [
					box.vec2(40, -21),
					box.vec2(40, 21),
					box.vec2(-40, 21),
					box.vec2(-40, -21)
				]
			}
			const toomo: BodyObject = {
				assetSrc: "toomo",
				bodyName: "トーモ",
				sharpList: [
					box.vec2(8.5, -37.5),
					box.vec2(25.5, -15.5),
					box.vec2(25.5, 16.5),
					box.vec2(19.5, 36.5),
					box.vec2(-14.5, 36.5),
					box.vec2(-31.5, 16.5),
					box.vec2(-36.5, -10.5),
					box.vec2(-15.5, -37.5)
				]
			}
			const remon: BodyObject = {
				assetSrc: "inu",
				bodyName: "レモン",
				sharpList: [
					box.vec2(13, -39.5),
					box.vec2(49, -4.5),
					box.vec2(50, 21.5),
					box.vec2(35, 39.5),
					box.vec2(-22, 40.5),
					box.vec2(-50, 21.5),
					box.vec2(-34, -25.5),
					box.vec2(-10, -39.5)
				]
			}
			const gozyou: BodyObject = {
				assetSrc: "gozyou",
				bodyName: "五条",
				sharpList: [
					box.vec2(0, -37.5),
					box.vec2(19, -32.5),
					box.vec2(28, -12.5),
					box.vec2(21, 11.5),
					box.vec2(5, 34.5),
					box.vec2(-7, 35.5),
					box.vec2(-23, 19.5),
					box.vec2(-30, 1.5),
					box.vec2(-30, -15.5),
					box.vec2(-22, -31.5),
					box.vec2(-5, -37.5)
				]
			}
			const korean: BodyObject = {
				assetSrc: "korean",
				bodyName: "韓国",
				sharpList: [
					box.vec2(8, -33.5),
					box.vec2(20, -19.5),
					box.vec2(18, 6.5),
					box.vec2(8, 33.5),
					box.vec2(-13, 33.5),
					box.vec2(-31, 7.5),
					box.vec2(-35, -10.5),
					box.vec2(-27, -31.5)
				]
			}
			const kiyomizu: BodyObject = {
				assetSrc: "kiyomizu",
				bodyName: "清水寺",
				sharpList: [
					box.vec2(8, -37),
					box.vec2(22, -27),
					box.vec2(26, -14),
					box.vec2(23, 17),
					box.vec2(11, 35),
					box.vec2(-1, 36),
					box.vec2(-15, 19),
					box.vec2(-27, 2),
					box.vec2(-24, -22),
					box.vec2(-5, -37)
				]
			}
			const kanemoti: BodyObject = {
				assetSrc: "kanemoti",
				bodyName: "年収2万円",
				sharpList: [
					box.vec2(0, -31.5),
					box.vec2(47, 31.5),
					box.vec2(-47, 32.5),
					box.vec2(-14, -31.5)
				]
			}
			// 利用可能な物体一覧
			const bodyTemplateList = [nKou, dt, toomo, remon, gozyou, korean, kiyomizu, kanemoti]

			/** 一番高いところにある物体の高さを取得します。
			 * @param defaultValue もし取れなかった場合は返り値になります
			 * @returns 一番高いY座標。
			 */
			const getHighestPos = (defaultValue: number = 0): number => {
				let pos = defaultValue
				const tmpList = bodyList.concat()
				if (tmpList.length > 0) {
					tmpList.sort((a, b) => {
						if (a.entity.y < b.entity.y) return -1
						if (a.entity.y > b.entity.y) return 1
						return 0
					})
					pos = tmpList[0].entity.y
				}
				return pos
			}

			/** 乱数生成機。長いので短くするだけで中身はAkashic Engineのものを利用している。JSの物を使うとタイムシフトでの動作がおかしくなるためだって */
			const random = (min: number, max: number): number => {
				return g.game.random.get(min, max)
			}

			/** 触っていないオブジェクトが存在する場合はtrue
			 * （まだ上にあって落下していないときはtrue）
			 */
			let isNotTouchObjctExists = false
			/** 物体の生成関数。
			 * @param obj 当たり判定とか画像の名前とか
			 * @param xPos X座標。クリックしたときに取れるのでそれ
			 */
			const createObject = (obj: BodyObject, xPos: number): b2.Box2DOptions.EBody => {
				isNotTouchObjctExists = true
				const entity = new g.Sprite({
					scene: scene,
					src: scene.assets[obj.assetSrc],
					width: (scene.assets[obj.assetSrc] as g.ImageAsset).width,
					height: (scene.assets[obj.assetSrc] as g.ImageAsset).height,
					x: xPos,
					y: getHighestPos(base.y) - 100,
					tag: obj // tagにはBodyObject入れました。
				})
				scene.append(entity)
				entity.modified()
				const entityFixDef = box.createFixtureDef({
					density: 1.0, // 密度
					friction: 0.5, // 摩擦係数
					restitution: 0.3, // 反発係数
					shape: box.createPolygonShape(obj.sharpList) // 形状
				})
				const entityDef = box.createBodyDef({
					type: b2.BodyType.Dynamic
				})
				const createBody = box.createBody(entity, entityDef, entityFixDef)

				// Q:これはなにか？ A:もし動かしてるときに詰んでたたわーが崩れるとカメラが移動する→移動中の物体が見切れる　これを対策するため
				entity.update.add(() => {
					entity.y = getHighestPos(base.y) - 100
					// Sprite移動だけではだめなので
					createBody.b2body.SetPosition(box.vec2(createBody.entity.x + entity.width / 2, createBody.entity.y + entity.height / 2))
					entity.modified()
				})

				// 回転ボタン押す
				rotateButton.pointDown.add(() => {
					entity.angle += 45
					// Spriteの変更だけではだめなので
					createBody.b2body.SetAngle(box.radian(entity.angle))
					entity.modified()
				})

				// 押すまでオブジェクトを睡眠？停止状態にする。寝てる間はDynamicでも動かない
				// 睡眠状態を利用可能にする
				createBody.b2body.SetSleepingAllowed(true)
				// おやすみ
				createBody.b2body.SetAwake(false)
				// X座標取得。ドラッグでできるように
				scene.pointMoveCapture.add((event) => {
					createBody.entity.x += event.prevDelta.x
					// Sprite移動だけではだめなので
					createBody.b2body.SetPosition(box.vec2(createBody.entity.x + entity.width / 2, createBody.entity.y + entity.height / 2))
					createBody.entity.modified()
				})
				// クリックを離したとき。
				const pointUp: g.HandlerFunction<g.PointUpEvent> = (event) => {
					// クリックを離したときの処理を行っていいか。trueで実行可能
					const isPointUp = checkClickable(event)
					if (isPointUp) {
						// クリックした場所が回転ボタンだったら無効
						// おはようのオーディションして～かみｇ
						createBody.b2body.SetAwake(true)
						isNotTouchObjctExists = false
						// 落としたら移動できないようにイベント消す
						scene.pointMoveCapture.removeAll()
						// クリックを離したときは他でも使っているためremoveAllすると影響受けるので
						scene.pointUpCapture.remove(pointUp)
						// カメラの移動と合わせて動かすイベント削除
						entity.update.removeAll()
						// 落としたら回転ボタンは押せなくする
						rotateButton.pointDown.removeAll()
						// 配列追加（一番高いなどを求めるときに使う。）
						bodyList.push(createBody)
					}
				}
				// クリックを離したときイベント登録。
				scene.pointUpCapture.add(pointUp)
				return createBody
			}

			// 画像生成。
			createObject(nKou, (g.game.width / 2))
			/** クリック連打対策用変数。クリック可能な場合はtrue。クリックすると物体生成までクリックできません。 */
			let clickable = true
			scene.pointUpCapture.add((event) => {
				const isPointUp = checkClickable(event)
				// クリック可能か？
				if (isPointUp && clickable) {
					// 音声再生
					const audioList = ["doumo_toomo", "gogo_no_zyugyou", "hattastu_syougai", "karaoke_ikuka", "katsudon_channel", "korean_sound", "n_kou_taigaku", "san_ryuunen", "teacher_block"]
					const audioRandomValue = random(0, audioList.length - 1)
					sound(audioList[audioRandomValue]).play()
					// クリックできないように
					clickable = false
					// 2秒後に生成
					scene.setTimeout(() => {
						// ランダム
						const randomValue = random(0, bodyTemplateList.length - 1)
						createObject(bodyTemplateList[randomValue], (g.game.width / 2))
						// クリック可能に
						clickable = true
					}, 2000)
				}
			})

			/** クリックしたところに回転ボタンが存在するか確認する関数。
			 * @param　event クリックイベントで取れるやつ。g.PointEventってやつ
			 * @returns クリック可能な場合（回転ボタンを押していない）はtrue、回転ボタンを押しているときはfalse
			 */
			const checkClickable = (event: g.PointEvent): boolean => {
				let click_ok = false
				if (typeof event.target !== "undefined" && typeof event.target.tag !== "undefined") {
					// タグに中身があるとき
					// 画像のタグが回転ボタンかどうか。回転ボタンだとfalse（trueを反転）
					click_ok = !(event.target.tag === "rotate")
				} else {
					// タグに中身が無いとき
					click_ok = true
				}
				return click_ok
			}

			// カメラ移動、スコアラベル、時間ラベル移動など
			const camera = new g.Camera2D({ game: g.game })
			g.game.focusingCamera = camera
			g.game.modified = true
			scene.update.add(() => {
				// 一番高いところにある物体のの座標
				const highest = getHighestPos(0)
				// 一番低いところにある物体のの座標。今回は受け皿
				const lowest = base.y
				// 絶対値計算
				let abs = Math.abs(lowest - highest)
				// ただし一回も物体を置いてない場合、受け皿の座標が絶対値になってしまうので対策
				if (bodyList.length === 0) {
					abs = 0
				}
				// カメラ移動
				if (abs > g.game.height - 100) {
					camera.y = highest - 100
					camera.modified()
				} else {
					camera.y = 0
					camera.modified()
				}
				// スコア、残り時間も移動
				scoreLabel.y = camera.y
				scoreLabel.modified()
				timeLabel.y = camera.y
				timeLabel.modified()
				// 回転ボタンも移動
				rotateButton.y = camera.y + 100
				rotateButton.modified()
				// 背景も移動
				background.y = camera.y
				background.modified()
				// 一番高いところをスコアに
				// 小数点以下切り捨て
				g.game.vars.gameState.score = Math.round(abs)
				scoreLabel.text = `スコア: ${g.game.vars.gameState.score}`
				scoreLabel.invalidate()
			})
			/** 一番低いところにある物体の底辺の座標を取得します。
			 * 例えば■が一番下にあったとき、■のY座標から■の高さだけ引いたものです。
			 * @param defaultValue もし取れなかった場合は返り値になります
			 * @returns 低いところにある物体の底辺の座標。
			 */
			const getLowestPos = (defaultValue: number = 0): number => {
				let pos = defaultValue
				const tmpList: b2.Box2DOptions.EBody[] = []
				// 画面外の物体はいらない
				bodyList.forEach(obj => {
					if (obj.entity.y <= g.game.height) {
						tmpList.push(obj)
					}
				})
				if (tmpList.length > 0) {
					tmpList.sort((a, b) => {
						if (a.entity.y < b.entity.y) return 1
						if (a.entity.y > b.entity.y) return -1
						return 0
					})
					pos = tmpList[0].entity.y - tmpList[0].entity.height
				}
				return pos
			}
			// カウントダウン処理
			const countdownInterval = scene.setInterval(() => {
				// ゲーム終了
				if (time <= 5) {
					// RPGアツマール環境であればランキングを表示します
					if (param.isAtsumaru) {
						const boardId = 1
						window.RPGAtsumaru.experimental.scoreboards.setRecord(boardId, g.game.vars.gameState.score).then(() => {
							window.RPGAtsumaru.experimental.scoreboards.display(boardId)
						})
					}
					scene.clearInterval(countdownInterval) // カウントダウンを止めるためにこのイベントハンドラを削除します
				}
				/** ラグを考えて5秒前にはゲームが終わるようにする。ゲームが60秒間遊べるように。 */
				if (time <= 5) {
					// クリックイベント削除。これで遊べなくなります
					scene.pointMoveCapture.removeAll()
					// カメラ戻す
					camera.y = 0
					camera.modified()
					// 背景も移動
					background.y = 0
					background.modified()
					// すべてのイベント削除
					scene.update.removeAll()
					scene.pointDownCapture.removeAll()
					// しゅうりょうー
					const resultSprite = new g.Sprite({ scene: scene, src: scene.assets["result"] })
					scene.append(resultSprite)
					// 積み上げ結果
					// 釣った結果ラベル
					const resultLabel_1 = new al.Label({
						scene: scene,
						text: "",
						fontSize: 20,
						font: font,
						textColor: "black",
						width: 500,
						x: 80,
						y: 60
					})
					scene.append(resultLabel_1)
					const resultLabel_2 = new al.Label({
						scene: scene,
						text: "",
						fontSize: 20,
						font: font,
						textColor: "black",
						width: 500,
						x: (g.game.width / 2),
						y: 60
					})
					scene.append(resultLabel_2)
					// 出現回数表示
					interface CountObj {
						/** 物体の名前。N高等学校など */
						name: string
						/** 物体の数。乱数に偏りがあるよね！って見れたら面白い。 */
						count: number
					}
					const countObjList: CountObj[] = []
					bodyList.forEach(obj => {
						const bodyObj = obj.entity.tag as BodyObject
						const name = bodyObj.bodyName
						// 配列にすでにあるか。無いとき-1
						let countObjIndex = -1
						countObjList.forEach(countObj => {
							if (countObj.name === name) {
								// あった
								countObjIndex = countObjList.indexOf(countObj)
							}
						})
						if (countObjIndex === -1) {
							// なかった
							const countObj: CountObj = {
								name: name,
								count: 1
							}
							countObjList.push(countObj)
						} else {
							// 1増やす
							countObjList[countObjIndex].count++
						}
					})
					// 点数の高い順に並べる
					countObjList.sort((a, b) => {
						if (a.count > b.count) return -1
						if (a.count < b.count) return 1
						return 0
					})
					// 表示
					let resultText_1 = "" // 一列目
					let resultText_2 = "" // 二列目
					let writeLine = 0 // 何行目まで行ったかどうか
					countObjList.forEach(countObj => {
						const name = countObj.name
						const count = countObj.count
						writeLine++
						// 次の行へ行くかどうか
						if (writeLine > 10) {
							// 二行目
							resultText_2 = `${resultText_2}\n${name} : ${count}個`
							resultLabel_2.text = resultText_2
							resultLabel_2.invalidate()
						} else {
							// 一行目。１０行まで書ける
							resultText_1 = `${resultText_1}\n${name} : ${count}個`
							resultLabel_1.text = resultText_1
							resultLabel_1.invalidate()
						}
					})
				}
				// 時間減らしていく
				time -= 1
				if (time - 5 >= 0) {
					// カウントダウン処理
					// ゲームが遊べる時は60秒。でもゲームは70秒あるので引いておく。
					// 5秒足して置くことで読み込み遅れても5秒なら耐えられる。
					timeLabel.text = "残り時間: " + Math.ceil(time - 5) + "秒"
					timeLabel.invalidate()
				}
			}, 1000)

			// ここまでゲーム内容を記述します
		})
		g.game.replaceScene(scene)
	}, 5000)
	// タイトル画面へ画面切り替え。
	g.game.pushScene(titleScene)

	/** 音声素材を返す
	 * @param assetIds 音声素材の名前。assetIdに追加しないとだめだよ
	 * @returns AudioAsset
	 */
	const sound = (assetId: string): g.AudioAsset => {
		return (scene.assets[assetId] as g.AudioAsset)
	}

}
