const STORAGE_KEY = 'customTextFillerLists';

figma.showUI(__html__, { width: 400, height: 560 });

figma.on('selectionchange', () => {
  const count = figma.currentPage.selection.filter(n => n.type === 'TEXT').length;
  figma.ui.postMessage({ type: 'selection-change', count });
});

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'get-selection': {
      const count = figma.currentPage.selection.filter(n => n.type === 'TEXT').length;
      figma.ui.postMessage({ type: 'selection-change', count });
      break;
    }
    case 'load-lists': {
      const lists = (await figma.clientStorage.getAsync(STORAGE_KEY)) || [];
      figma.ui.postMessage({ type: 'lists-data', lists });
      break;
    }
    case 'save-lists': {
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.lists);
      break;
    }
    case 'apply': {
      const { items, mode, includeBlank } = msg;
      const textLayers = figma.currentPage.selection
        .filter((node) => node.type === 'TEXT')
        .sort((a, b) => {
          const ay = a.absoluteBoundingBox ? a.absoluteBoundingBox.y : a.y;
          const by = b.absoluteBoundingBox ? b.absoluteBoundingBox.y : b.y;
          const ax = a.absoluteBoundingBox ? a.absoluteBoundingBox.x : a.x;
          const bx = b.absoluteBoundingBox ? b.absoluteBoundingBox.x : b.x;
          return ay !== by ? ay - by : ax - bx;
        });
      if (textLayers.length === 0) { figma.notify('텍스트 레이어를 선택해주세요.'); return; }
      if (!items || items.length === 0) { figma.notify('데이터가 없습니다.'); return; }
      let pool = [...items];
      if (mode === 'asc')  pool = [...items].sort((a,b)=>String(a).localeCompare(String(b),'ko'));
      if (mode === 'desc') pool = [...items].sort((a,b)=>String(b).localeCompare(String(a),'ko'));
      for (let i = 0; i < textLayers.length; i++) {
        const layer = textLayers[i];
        const fonts = layer.getRangeAllFontNames(0, layer.characters.length);
        for (const font of fonts) await figma.loadFontAsync(font);
        // 공백포함 ON이면 레이어마다 30% 확률로 빈 텍스트
        if (includeBlank && Math.random() < 0.3) {
          layer.characters = '';
          continue;
        }
        const value = mode === 'random'
          ? pool[Math.floor(Math.random() * pool.length)]
          : pool[i % pool.length];
        layer.characters = String(value);
      }
      figma.notify(`${textLayers.length}개 레이어에 적용했습니다.`);
      break;
    }
  }
};
