const STORAGE_KEY = 'customTextFillerLists';

figma.showUI(__html__, { width: 320, height: 560 });

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
      const lists = (await figma.clientStorage.getAsync(STORAGE_KEY)) ?? [];
      figma.ui.postMessage({ type: 'lists-data', lists });
      break;
    }
    case 'save-lists': {
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.lists);
      break;
    }
    case 'apply': {
      const { items, mode } = msg;
      const textLayers = figma.currentPage.selection.filter(
        (node): node is TextNode => node.type === 'TEXT'
      );
      if (textLayers.length === 0) { figma.notify('텍스트 레이어를 선택해주세요.'); return; }
      if (!items || items.length === 0) { figma.notify('데이터가 없습니다.'); return; }
      for (let i = 0; i < textLayers.length; i++) {
        const layer = textLayers[i];
        const fonts = layer.getRangeAllFontNames(0, layer.characters.length);
        for (const font of fonts) await figma.loadFontAsync(font);
        const value = mode === 'sequential'
          ? items[i % items.length]
          : items[Math.floor(Math.random() * items.length)];
        layer.characters = String(value);
      }
      figma.notify(`${textLayers.length}개 레이어에 적용했습니다.`);
      break;
    }
  }
};
