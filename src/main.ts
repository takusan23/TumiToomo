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
		assetIds: ["toomo", "kiyomizu", "n_kou", "result"]
	})

	let time = 60 // 制限時間
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

	/** タイトル画面作成 */
	const titleScene = new g.Scene({ game: g.game, assetIds: ["title"] })
	// 読み込みが終わったら
	titleScene.loaded.add(() => {
		// 画像追加
		const titleSprite = new g.Sprite({ scene: titleScene, src: titleScene.assets["title"] })
		titleScene.append(titleSprite)
		// 5秒後にスタート
		titleScene.setTimeout(() => {
			// 5秒引いておく（タイトル表示時間）
			time -= 5
			scene.loaded.add(() => {
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
					text: "残り時間: 60",
					font: font,
					fontSize: font.size / 2,
					textColor: "black",
					x: 0.7 * g.game.width
				})
				scene.append(timeLabel)

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
				const bodyTemplateList = [nKou]

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
					const pointDown = () => {
						// おはようのオーディションして～かみｇ
						createBody.b2body.SetAwake(true)
						isNotTouchObjctExists = false
						// 落としたら移動できないようにイベント消す
						scene.pointMoveCapture.removeAll()
						// クリックを離したときは他でも使っているためremoveAllすると影響受けるので
						scene.pointUpCapture.remove(pointDown)
						// カメラの移動と合わせて動かすイベント削除
						entity.update.removeAll()
						// 配列追加（一番高いなどを求めるときに使う。）
						bodyList.push(createBody)
					}
					// クリックを離したときイベント登録。
					scene.pointUpCapture.add(pointDown)
					return createBody
				}

				// 画像生成。
				createObject(nKou, (g.game.width / 2))
				scene.pointUpCapture.add(() => {
					setTimeout(() => { createObject(nKou, (g.game.width / 2)) }, 2000)
				})

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
					if (time <= 0) {
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
						// ゲームが遊べる時は60秒。でもゲームは65秒あるので引いておく。
						// 5秒足して置くことで読み込み遅れても5秒なら耐えられる。
						timeLabel.text = "残り時間: " + Math.ceil(time - 5) + "秒"
						timeLabel.invalidate()
					}
				}, 1000)

				// ここまでゲーム内容を記述します
			})
			g.game.replaceScene(scene)
		}, 5000)
	})
	// タイトル画面へ画面切り替え。
	g.game.pushScene(titleScene)

}
