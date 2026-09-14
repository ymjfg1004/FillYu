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
    case 'apply-mapping': {
      const registry: Record<string, string[]> = msg.registry || {};
      const selection = figma.currentPage.selection;
      if (selection.length === 0) { figma.notify('레이어를 선택해주세요.'); return; }

      const textNodes: TextNode[] = [];
      const collect = (node: SceneNode) => {
        if (node.type === 'TEXT') textNodes.push(node);
        else if ('children' in node) node.children.forEach(collect);
      };
      selection.forEach(collect);

      const normalizeKey = (name: string) => name.replace(/^#/, '').trim();

      let appliedCount = 0;
      let unmatchedCount = 0;
      for (const node of textNodes) {
        const values = registry[normalizeKey(node.name)];
        if (!values || values.length === 0) { unmatchedCount++; continue; }
        const fonts = node.getRangeAllFontNames(0, node.characters.length);
        for (const font of fonts) await figma.loadFontAsync(font);
        node.characters = String(values[Math.floor(Math.random() * values.length)]);
        appliedCount++;
      }

      if (appliedCount === 0) {
        figma.notify('일치하는 레이어가 없습니다. 레이어 이름을 데이터 이름과 동일하게 설정해주세요.');
      } else {
        figma.notify(`${appliedCount}개 레이어에 적용됨${unmatchedCount > 0 ? `, ${unmatchedCount}개는 일치하는 데이터 없음` : ''}`);
      }
      break;
    }
  }
};
