"""Test de bout en bout (Chromium headless) : démarrage, ville, marche, voiture, quartier.
Pré-requis : pip install playwright && playwright install chromium ; npm run build ; npx vite preview --port 4173
Le jeu expose son état à ?blvdebug (voir ThreeCanvas.tsx).
"""
import os, asyncio, json, math
os.environ['PLAYWRIGHT_BROWSERS_PATH']='/opt/pw-browsers'
from playwright.async_api import async_playwright
PRIO=['NOUVELLE','LANCER MON DESTIN','ENTRER']
res=[]
def check(name, ok, info=''):
    res.append(ok); print(('✅' if ok else '❌'), name, ('— '+str(info)) if info else '', flush=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl'])
        page = await (await b.new_context(viewport={'width':800,'height':450})).new_page()
        logs=[]
        page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await page.goto('http://127.0.0.1:4173/?blvdebug'); await page.wait_for_timeout(1200)
        for step in range(24):
            if await page.locator('button', has_text='Vue ').count()>0: break
            for key in PRIO:
                loc=page.locator('button', has_text=key)
                if await loc.count()>0 and await loc.first.is_visible():
                    await loc.first.click(); break
            await page.wait_for_timeout(2000)
        await page.wait_for_function("()=>window.__blv && window.__blv.state().ready", timeout=120000)
        S = lambda: page.evaluate("()=>window.__blv.state()")
        st = await S()
        check('Ville chargée autour du joueur (≥ 9 chunks) et physique démarrée', st['chunks']>=9 and st['ready'], f"{st['chunks']} chunks, {st['solids']} solides, parcelle {st['lot']['id']}")
        check('Le joueur apparaît sur sa parcelle (centre de la maison)', math.hypot(st['player']['x']-st['lot']['x'], st['player']['z']-st['lot']['z'])<1.5)
        check('La voiture est garée dans la rue devant la parcelle', 6 < math.hypot(st['car']['x']-st['lot']['x'], st['car']['z']-st['lot']['z']) < 22, f"{math.hypot(st['car']['x']-st['lot']['x'], st['car']['z']-st['lot']['z']):.1f} m")

        # Marche jusqu'à la voiture (touches relatives à la caméra : D = +x, A = -x, W = -z, S = +z)
        prompt = page.locator('button', has_text='[✕ / CLIC]')
        best=1e9; stuck=0; axis_flip=False
        for it in range(70):
            if await prompt.count()>0: break
            st = await S(); dx=st['car']['x']-st['player']['x']; dz=st['car']['z']-st['player']['z']; d=math.hypot(dx,dz)
            if d>best-0.15: stuck+=1
            else: stuck=0
            best=min(best,d)
            if stuck>=2: axis_flip=not axis_flip; stuck=0
            horiz = abs(dx)>abs(dz)
            if axis_flip: horiz = not horiz
            key = ('d' if dx>0 else 'a') if horiz else ('s' if dz>0 else 'w')
            await page.keyboard.down(key); await page.wait_for_timeout(450); await page.keyboard.up(key); await page.wait_for_timeout(150)
        check("Prompt « CONDUIRE LA VOITURE » atteint à pied", await prompt.count()>0, f"distance min {best:.1f} m")
        await page.keyboard.press('e')
        await page.wait_for_function("()=>window.__blv.state().driving", timeout=8000)
        check('Touche E : au volant', (await S())['driving'])
        start = await S()
        await page.keyboard.down('w')
        try:
            await page.wait_for_function("()=>window.__blv.state().car.speed>12", timeout=90000)
            sp=True
        except Exception: sp=False
        st = await S()
        check('Accélération dans la ville (> 12 m/s = 43 km/h)', sp, f"{st['car']['speed']:.1f} m/s")
        # Conduire un moment : franchir plusieurs chunks
        await page.wait_for_timeout(14000)
        st2 = await S()
        moved = math.hypot(st2['car']['x']-start['car']['x'], st2['car']['z']-start['car']['z'])
        check('La voiture avance de plusieurs dizaines de mètres', moved>40, f"{moved:.0f} m")
        check('Les zones se chargent et se déchargent (bornées)', 9<=st2['chunks']<=121 and st2['solids']<40000, f"{st2['chunks']} chunks, {st2['solids']} solides")
        banner = await page.evaluate("()=>{const e=[...document.querySelectorAll('span')].find(x=>x.textContent.trim().startsWith('📍')); return e?e.textContent.trim():null}")
        check('Bandeau de quartier réel (commune ou pont)', bool(banner) and 'ABIDJAN'!=banner, banner)
        await page.screenshot(path='/tmp/drive1.png')
        await page.keyboard.up('w')
        await page.keyboard.press('e'); await page.wait_for_timeout(1500)
        check('Touche E : on redescend à côté de la voiture', not (await S())['driving'])
        errs=[l for l in logs if (l.startswith('[error]') or l.startswith('[pageerror]')) and 'ERR_NAME' not in l and 'net::' not in l]
        check('Aucune erreur console', len(errs)==0, ' | '.join(errs)[:300])
        await b.close()
    print('BILAN', sum(res), '/', len(res))
asyncio.run(main())
