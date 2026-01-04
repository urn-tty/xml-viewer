/**
 * XML Viewer Application
 * XMLファイルをドラッグ&ドロップでプレビュー表示するアプリケーション
 */

interface XMLNodeData {
  tagName: string;
  attributes: Map<string, string>;
  children: (XMLNodeData | string)[];
  isElement: boolean;
}

class XMLViewer {
  private dropZone: HTMLElement;
  private fileInput: HTMLInputElement;
  private browseBtn: HTMLButtonElement;
  private viewerContainer: HTMLElement;
  private xmlTree: HTMLElement;
  private xmlRaw: HTMLElement;
  private xmlTable: HTMLElement;
  private xmlForm: HTMLElement;
  private formContent: HTMLElement;
  private treeView: HTMLElement;
  private rawView: HTMLElement;
  private tableView: HTMLElement;
  private formView: HTMLElement;
  private treeTab: HTMLButtonElement;
  private rawTab: HTMLButtonElement;
  private tableTab: HTMLButtonElement;
  private formTab: HTMLButtonElement;
  private printFormBtn: HTMLButtonElement;
  private formTemplateSelect: HTMLSelectElement;
  private fileName: HTMLElement;
  private fileSize: HTMLElement;
  private copyBtn: HTMLButtonElement;
  private downloadBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private currentFile: File | null = null;
  private currentXMLContent: string = '';
  private currentXMLDoc: Document | null = null;

  constructor() {
    // DOM要素の初期化
    this.dropZone = this.getElement('#dropZone');
    this.fileInput = this.getElement('#fileInput') as HTMLInputElement;
    this.browseBtn = this.getElement('#browseBtn') as HTMLButtonElement;
    this.viewerContainer = this.getElement('#viewerContainer');
    this.xmlTree = this.getElement('#xmlTree');
    this.xmlRaw = this.getElement('#xmlRaw');
    this.xmlTable = this.getElement('#xmlTable');
    this.xmlForm = this.getElement('#xmlForm');
    this.formContent = this.getElement('#formContent');
    this.treeView = this.getElement('#treeView');
    this.rawView = this.getElement('#rawView');
    this.tableView = this.getElement('#tableView');
    this.formView = this.getElement('#formView');
    this.treeTab = this.getElement('#treeTab') as HTMLButtonElement;
    this.rawTab = this.getElement('#rawTab') as HTMLButtonElement;
    this.tableTab = this.getElement('#tableTab') as HTMLButtonElement;
    this.formTab = this.getElement('#formTab') as HTMLButtonElement;
    this.printFormBtn = this.getElement('#printFormBtn') as HTMLButtonElement;
    this.formTemplateSelect = this.getElement('#formTemplateSelect') as HTMLSelectElement;
    this.fileName = this.getElement('#fileName');
    this.fileSize = this.getElement('#fileSize');
    this.copyBtn = this.getElement('#copyBtn') as HTMLButtonElement;
    this.downloadBtn = this.getElement('#downloadBtn') as HTMLButtonElement;
    this.closeBtn = this.getElement('#closeBtn') as HTMLButtonElement;

    this.initializeEventListeners();
  }

  private getElement(selector: string): HTMLElement {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element as HTMLElement;
  }

  private initializeEventListeners(): void {
    // ドラッグ&ドロップイベント
    this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
    this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.dropZone.addEventListener('drop', this.handleDrop.bind(this));

    // ファイル選択イベント
    this.browseBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    // タブ切り替えイベント
    this.formTab.addEventListener('click', () => this.switchTab('form'));
    this.tableTab.addEventListener('click', () => this.switchTab('table'));
    this.treeTab.addEventListener('click', () => this.switchTab('tree'));
    this.rawTab.addEventListener('click', () => this.switchTab('raw'));
    
    // 帳票関連イベント
    this.printFormBtn.addEventListener('click', () => window.print());
    this.formTemplateSelect.addEventListener('change', () => this.refreshFormView());

    // アクションボタンイベント
    this.copyBtn.addEventListener('click', this.handleCopy.bind(this));
    this.downloadBtn.addEventListener('click', this.handleDownload.bind(this));
    this.closeBtn.addEventListener('click', this.handleClose.bind(this));
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dropZone.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dropZone.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dropZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private handleFileSelect(e: Event): void {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private async processFile(file: File): Promise<void> {
    // ファイルタイプのチェック
    if (!file.name.endsWith('.xml')) {
      this.showToast('XMLファイルを選択してください', 'error');
      return;
    }

    try {
      this.currentFile = file;
      this.currentXMLContent = await this.readFileContent(file);

      // ファイル情報の表示
      this.fileName.textContent = file.name;
      this.fileSize.textContent = this.formatFileSize(file.size);

      // XMLのパースと表示
      this.parseAndDisplayXML(this.currentXMLContent);

      // ビューアーの表示
      this.dropZone.style.display = 'none';
      this.viewerContainer.classList.remove('hidden');

      this.showToast('XMLファイルを読み込みました', 'success');
    } catch (error) {
      console.error('Error processing file:', error);
      this.showToast('ファイルの読み込みに失敗しました', 'error');
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file);
    });
  }

  private parseAndDisplayXML(xmlContent: string): void {
    try {
      // XMLパーサーを使用してパース
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // パースエラーのチェック
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XMLのパースに失敗しました');
      }

      this.currentXMLDoc = xmlDoc;

      // 帳票プレビューの生成
      this.formContent.innerHTML = '';
      this.renderXMLForm(xmlDoc.documentElement, this.formContent);

      // テーブル表示の生成
      this.xmlTable.innerHTML = '';
      this.renderXMLTable(xmlDoc.documentElement, this.xmlTable);

      // ツリー表示の生成
      this.xmlTree.innerHTML = '';
      this.renderXMLTree(xmlDoc.documentElement, this.xmlTree);

      // Raw表示
      this.xmlRaw.textContent = this.formatXML(xmlContent);
    } catch (error) {
      console.error('Error parsing XML:', error);
      this.showToast('XMLのパースに失敗しました', 'error');
    }
  }

  private renderXMLTree(node: Node, container: HTMLElement, level: number = 0): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const elementDiv = document.createElement('div');
      elementDiv.className = 'xml-element';

      // 開始タグの作成
      const tagDiv = document.createElement('div');
      tagDiv.style.display = 'flex';
      tagDiv.style.alignItems = 'flex-start';

      // 子要素がある場合はトグルボタンを追加
      const hasChildren = element.childNodes.length > 0 && 
                          Array.from(element.childNodes).some(child => 
                            child.nodeType === Node.ELEMENT_NODE || 
                            (child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
                          );

      let childrenDiv: HTMLElement | null = null;

      if (hasChildren) {
        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'xml-toggle expanded';
        childrenDiv = document.createElement('div');
        childrenDiv.className = 'xml-children';
        
        toggleBtn.addEventListener('click', () => {
          toggleBtn.classList.toggle('expanded');
          toggleBtn.classList.toggle('collapsed');
          if (childrenDiv) {
            childrenDiv.classList.toggle('collapsed');
          }
        });
        tagDiv.appendChild(toggleBtn);
      } else {
        const spacer = document.createElement('span');
        spacer.style.width = '20px';
        spacer.style.display = 'inline-block';
        tagDiv.appendChild(spacer);
      }

      // タグ名
      const tagNameSpan = document.createElement('span');
      tagNameSpan.className = 'xml-tag';
      tagNameSpan.textContent = `<${element.tagName}`;
      tagDiv.appendChild(tagNameSpan);

      // 属性の追加
      if (element.attributes.length > 0) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          const attrSpan = document.createElement('span');
          
          const attrNameSpan = document.createElement('span');
          attrNameSpan.className = 'xml-attr-name';
          attrNameSpan.textContent = attr.name;
          
          const attrValueSpan = document.createElement('span');
          attrValueSpan.className = 'xml-attr-value';
          attrValueSpan.textContent = `="${attr.value}"`;
          
          attrSpan.appendChild(attrNameSpan);
          attrSpan.appendChild(attrValueSpan);
          tagDiv.appendChild(attrSpan);
        }
      }

      const closingBracket = document.createElement('span');
      closingBracket.className = 'xml-tag';
      closingBracket.textContent = hasChildren ? '>' : ' />';
      tagDiv.appendChild(closingBracket);

      elementDiv.appendChild(tagDiv);

      // 子要素の処理
      if (hasChildren && childrenDiv) {
        // テキストノードと要素ノードを処理
        for (let i = 0; i < element.childNodes.length; i++) {
          const child = element.childNodes[i];
          
          if (child.nodeType === Node.ELEMENT_NODE) {
            this.renderXMLTree(child, childrenDiv, level + 1);
          } else if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) {
              const textDiv = document.createElement('div');
              const textSpan = document.createElement('span');
              textSpan.className = 'xml-text';
              textSpan.textContent = text;
              textDiv.appendChild(textSpan);
              childrenDiv.appendChild(textDiv);
            }
          } else if (child.nodeType === Node.COMMENT_NODE) {
            const commentDiv = document.createElement('div');
            const commentSpan = document.createElement('span');
            commentSpan.className = 'xml-comment';
            commentSpan.textContent = `<!-- ${child.textContent} -->`;
            commentDiv.appendChild(commentSpan);
            childrenDiv.appendChild(commentDiv);
          }
        }

        elementDiv.appendChild(childrenDiv);

        // 終了タグ
        const closingTagDiv = document.createElement('div');
        const closingTagSpan = document.createElement('span');
        closingTagSpan.className = 'xml-tag';
        closingTagSpan.textContent = `</${element.tagName}>`;
        closingTagDiv.appendChild(closingTagSpan);
        elementDiv.appendChild(closingTagDiv);
      }

      container.appendChild(elementDiv);
    }
  }

  private renderXMLTable(rootElement: Element, container: HTMLElement): void {
    // XMLの構造を分析してテーブル表示可能なデータを抽出
    const tables = this.extractTablesFromXML(rootElement);

    if (tables.length === 0) {
      // テーブルとして表示できるデータがない場合
      const noDataDiv = document.createElement('div');
      noDataDiv.className = 'no-table-data';
      noDataDiv.innerHTML = `
        <p>📊 このXMLにはテーブル形式で表示できる繰り返しデータが見つかりませんでした。</p>
        <p>ツリー表示またはRaw表示をご利用ください。</p>
      `;
      container.appendChild(noDataDiv);
      return;
    }

    // 各テーブルを表示
    tables.forEach((tableData, index) => {
      const tableSection = document.createElement('div');
      tableSection.className = 'table-section';

      // テーブルタイトル
      const titleDiv = document.createElement('div');
      titleDiv.className = 'table-title';
      titleDiv.textContent = `${tableData.name} (${tableData.rows.length} 件)`;
      tableSection.appendChild(titleDiv);

      // テーブルコンテナ
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-wrapper';

      // テーブル作成
      const table = document.createElement('table');
      table.className = 'excel-table';

      // ヘッダー
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      // 行番号列
      const rowNumHeader = document.createElement('th');
      rowNumHeader.className = 'row-number-header';
      rowNumHeader.textContent = '#';
      headerRow.appendChild(rowNumHeader);

      // データ列
      tableData.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        th.title = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // ボディ
      const tbody = document.createElement('tbody');
      tableData.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        // 行番号
        const rowNumCell = document.createElement('td');
        rowNumCell.className = 'row-number';
        rowNumCell.textContent = (rowIndex + 1).toString();
        tr.appendChild(rowNumCell);

        // データセル
        tableData.columns.forEach(col => {
          const td = document.createElement('td');
          const value = row[col];
          
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              // ネストされたオブジェクトの場合
              td.textContent = JSON.stringify(value, null, 2);
              td.className = 'nested-data';
              td.title = JSON.stringify(value, null, 2);
            } else {
              td.textContent = value.toString();
              td.title = value.toString();
            }
          } else {
            td.textContent = '';
            td.className = 'empty-cell';
          }
          
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableWrapper.appendChild(table);
      tableSection.appendChild(tableWrapper);
      container.appendChild(tableSection);
    });
  }

  private extractTablesFromXML(element: Element, processedPaths: Set<string> = new Set()): Array<{name: string, columns: string[], rows: Array<Record<string, any>>}> {
    const tables: Array<{name: string, columns: string[], rows: Array<Record<string, any>>}> = [];
    
    // 現在の要素のパスを生成
    const currentPath = this.getElementPath(element);
    
    // 子要素をグループ化して分析
    const childElements: Element[] = [];
    for (let i = 0; i < element.children.length; i++) {
      childElements.push(element.children[i]);
    }

    // 同じタグ名の子要素をグループ化
    const groupedElements = new Map<string, Element[]>();
    childElements.forEach(child => {
      const tagName = child.tagName;
      if (!groupedElements.has(tagName)) {
        groupedElements.set(tagName, []);
      }
      groupedElements.get(tagName)!.push(child);
    });

    // グループ化された要素を処理
    groupedElements.forEach((elements, tagName) => {
      const tablePath = `${currentPath}/${tagName}`;
      
      // すでに処理済みの場合はスキップ
      if (processedPaths.has(tablePath)) {
        return;
      }
      
      // 要素が1つしかなく、その要素が複数の同じタグの子要素を持つ場合
      // （例: <employees>の下に複数の<employee>がある場合）
      if (elements.length === 1 && elements[0].children.length > 0) {
        const containerElement = elements[0];
        const containerChildren: Element[] = [];
        
        for (let i = 0; i < containerElement.children.length; i++) {
          containerChildren.push(containerElement.children[i]);
        }
        
        // コンテナの子要素をグループ化
        const containerGrouped = new Map<string, Element[]>();
        containerChildren.forEach(child => {
          const childTagName = child.tagName;
          if (!containerGrouped.has(childTagName)) {
            containerGrouped.set(childTagName, []);
          }
          containerGrouped.get(childTagName)!.push(child);
        });
        
        // コンテナの子要素で複数あるものをテーブル化
        containerGrouped.forEach((containerElems, containerTagName) => {
          if (containerElems.length >= 1) {
            const subTablePath = `${tablePath}/${containerTagName}`;
            if (!processedPaths.has(subTablePath)) {
              processedPaths.add(subTablePath);
              const tableData = this.createTableFromElements(containerElems, containerTagName);
              if (tableData) {
                tables.push(tableData);
              }
            }
          }
        });
      } else if (elements.length >= 1) {
        // 通常の繰り返し要素をテーブル化
        processedPaths.add(tablePath);
        const tableData = this.createTableFromElements(elements, tagName);
        if (tableData) {
          tables.push(tableData);
        }
      }
    });

    return tables;
  }

  private createTableFromElements(elements: Element[], tagName: string): {name: string, columns: string[], rows: Array<Record<string, any>>} | null {
    const columns = new Set<string>();
    const rows: Array<Record<string, any>> = [];

    elements.forEach(elem => {
          const row: Record<string, any> = {};

          // 属性を列として追加
          for (let i = 0; i < elem.attributes.length; i++) {
            const attr = elem.attributes[i];
            columns.add(`@${attr.name}`);
            row[`@${attr.name}`] = attr.value;
          }

          // 子要素を列として追加（重複を避ける）
          const processedChildTags = new Set<string>();
          for (let i = 0; i < elem.children.length; i++) {
            const child = elem.children[i];
            const childTagName = child.tagName;
            
            // すでに処理済みのタグはスキップ
            if (processedChildTags.has(childTagName)) {
              continue;
            }
            processedChildTags.add(childTagName);
            
            // 同じタグ名の子要素を全て取得
            const sameTagChildren: Element[] = [];
            for (let j = 0; j < elem.children.length; j++) {
              if (elem.children[j].tagName === childTagName) {
                sameTagChildren.push(elem.children[j]);
              }
            }
            
            // 子要素にさらに子要素がある場合
            if (child.children.length > 0) {
              if (sameTagChildren.length > 1) {
                // 配列として表示
                const arrayData = sameTagChildren.map(sc => {
                  const obj: Record<string, any> = {};
                  for (let k = 0; k < sc.children.length; k++) {
                    obj[sc.children[k].tagName] = sc.children[k].textContent?.trim() || '';
                  }
                  return obj;
                });
                columns.add(childTagName);
                row[childTagName] = JSON.stringify(arrayData);
              } else {
                // 単一のネストオブジェクト
                const nestedData: Record<string, any> = {};
                for (let j = 0; j < child.children.length; j++) {
                  const nestedChild = child.children[j];
                  nestedData[nestedChild.tagName] = nestedChild.textContent?.trim() || '';
                }
                columns.add(childTagName);
                row[childTagName] = JSON.stringify(nestedData, null, 2);
              }
            } else {
              // 同じタグが複数ある場合
              if (sameTagChildren.length > 1) {
                const values = sameTagChildren.map(sc => sc.textContent?.trim() || '');
                columns.add(childTagName);
                row[childTagName] = values.join(', ');
              } else {
                columns.add(childTagName);
                row[childTagName] = child.textContent?.trim() || '';
              }
            }
          }

          // テキストコンテンツ（子要素がない場合）
          if (elem.children.length === 0) {
            const text = elem.textContent?.trim();
            if (text) {
              columns.add('_text');
              row['_text'] = text;
            }
          }

      rows.push(row);
    });

    if (rows.length === 0) {
      return null;
    }

    return {
      name: tagName,
      columns: Array.from(columns),
      rows: rows
    };
  }

  private getElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      path.unshift(current.tagName);
      current = current.parentElement;
    }
    
    return path.join('/');
  }

  private formatXML(xml: string): string {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(xmlDoc);
      
      // 簡易的なフォーマット（インデント追加）
      let formatted2 = '';
      let indent = 0;
      formatted.split(/>\s*</).forEach((node) => {
        if (node.match(/^\/\w/)) indent--;
        formatted2 += '  '.repeat(indent < 0 ? 0 : indent) + '<' + node + '>\n';
        if (node.match(/^<?\w[^>]*[^\/]$/)) indent++;
      });
      
      return formatted2.substring(1, formatted2.length - 2);
    } catch (error) {
      return xml;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private switchTab(tab: 'form' | 'table' | 'tree' | 'raw'): void {
    // すべてのタブを非アクティブに
    this.formTab.classList.remove('active');
    this.tableTab.classList.remove('active');
    this.treeTab.classList.remove('active');
    this.rawTab.classList.remove('active');

    // すべてのビューを非表示に
    this.formView.classList.add('hidden');
    this.tableView.classList.add('hidden');
    this.treeView.classList.add('hidden');
    this.rawView.classList.add('hidden');

    // 選択されたタブとビューをアクティブに
    if (tab === 'form') {
      this.formTab.classList.add('active');
      this.formView.classList.remove('hidden');
    } else if (tab === 'table') {
      this.tableTab.classList.add('active');
      this.tableView.classList.remove('hidden');
    } else if (tab === 'tree') {
      this.treeTab.classList.add('active');
      this.treeView.classList.remove('hidden');
    } else {
      this.rawTab.classList.add('active');
      this.rawView.classList.remove('hidden');
    }
  }

  private refreshFormView(): void {
    if (this.currentXMLDoc) {
      this.formContent.innerHTML = '';
      this.renderXMLForm(this.currentXMLDoc.documentElement, this.formContent);
    }
  }

  private renderXMLForm(rootElement: Element, container: HTMLElement): void {
    const template = this.formTemplateSelect.value;
    
    const document = this.createElement('div', 'document');
    
    // XMLの構造を解析してフォームとして表示
    this.renderFormByTemplate(rootElement, document, template);
    
    container.appendChild(document);
  }

  private renderFormByTemplate(element: Element, container: HTMLElement, template: string): void {
    // 帳票の種類を判定
    const rootTag = this.getLocalTagName(element.tagName);
    
    if (rootTag === 'TEG830') {
      // 寄附金控除に関する証明書
      this.renderTEG830Form(element, container);
    } else {
      // 汎用フォーム
      this.renderGenericForm(element, container);
    }
  }

  private renderTEG830Form(element: Element, container: HTMLElement): void {
    // タイトル
    const title = this.createElement('h1', 'document-title');
    title.textContent = '寄附金控除に関する証明書';
    container.appendChild(title);
    
    // サブタイトル
    const subtitle = this.createElement('div', 'document-subtitle');
    subtitle.textContent = '(特定事業者が電磁的方法により提供する証明書)';
    subtitle.style.marginBottom = '2rem';
    container.appendChild(subtitle);
    
    // TEG830-1要素を取得
    const teg8301 = element.querySelector('TEG830-1');
    if (!teg8301) {
      this.renderGenericForm(element, container);
      return;
    }
    
    // 基本情報セクション
    this.renderTEG830BasicInfo(teg8301, container);
    
    // 寄付者情報セクション
    this.renderTEG830DonorInfo(teg8301, container);
    
    // 寄付先情報セクション（テーブル）
    this.renderTEG830DonationTable(teg8301, container);
  }

  private renderTEG830BasicInfo(element: Element, container: HTMLElement): void {
    const section = this.createElement('div', 'document-section');
    
    const sectionTitle = this.createElement('h3', 'document-subtitle');
    sectionTitle.textContent = '■ 対象年度';
    section.appendChild(sectionTitle);
    
    const wma = element.querySelector('WMA00000');
    if (wma) {
      const era = this.getElementText(wma, 'era');
      const yy = this.getElementText(wma, 'yy');
      
      const field = this.createElement('div', 'document-text');
      field.innerHTML = `<strong>令和${era}年${yy}月分</strong>`;
      field.style.fontSize = '1.1rem';
      section.appendChild(field);
    }
    
    container.appendChild(section);
  }

  private renderTEG830DonorInfo(element: Element, container: HTMLElement): void {
    const section = this.createElement('div', 'document-section');
    
    const sectionTitle = this.createElement('h3', 'document-subtitle');
    sectionTitle.textContent = '■ 寄付者情報';
    section.appendChild(sectionTitle);
    
    const infoBox = this.createElement('div', 'info-box');
    
    // フィールドマッピング
    const fields = [
      { selector: 'WMB00000 kubun_CD', label: '区分', value: this.getKubunName(this.getElementText(element, 'WMB00000 kubun_CD')) },
      { selector: 'WMC00000', label: '氏名', value: this.getElementText(element, 'WMC00000') },
      { selector: 'WME00000', label: '住所', value: this.getElementText(element, 'WME00000') },
      { selector: 'WMF00000', label: '寄附金額合計', value: this.formatCurrency(this.getElementText(element, 'WMF00000')) },
      { selector: 'WMG00000', label: '根拠法令', value: this.getElementText(element, 'WMG00000') }
    ];
    
    const grid = this.createElement('div', 'form-grid');
    
    fields.forEach(field => {
      if (field.value) {
        const gridItem = this.createElement('div', 'form-grid-item');
        gridItem.innerHTML = `
          <div class="form-grid-item-label">${field.label}</div>
          <div class="form-grid-item-value">${field.value}</div>
        `;
        grid.appendChild(gridItem);
      }
    });
    
    infoBox.appendChild(grid);
    section.appendChild(infoBox);
    container.appendChild(section);
    
    // 事業者情報
    const companySection = this.createElement('div', 'document-section');
    const companyTitle = this.createElement('h3', 'document-subtitle');
    companyTitle.textContent = '■ 特定事業者情報';
    companySection.appendChild(companyTitle);
    
    const companyBox = this.createElement('div', 'info-box');
    const companyFields = [
      { selector: 'WMJ00000', label: '事業者名', value: this.getElementText(element, 'WMJ00000') },
      { selector: 'WMK00000 hojinbango', label: '法人番号', value: this.getElementText(element, 'WMK00000 hojinbango') }
    ];
    
    const companyGrid = this.createElement('div', 'form-grid');
    companyFields.forEach(field => {
      if (field.value) {
        const gridItem = this.createElement('div', 'form-grid-item');
        gridItem.innerHTML = `
          <div class="form-grid-item-label">${field.label}</div>
          <div class="form-grid-item-value">${field.value}</div>
        `;
        companyGrid.appendChild(gridItem);
      }
    });
    
    companyBox.appendChild(companyGrid);
    companySection.appendChild(companyBox);
    container.appendChild(companySection);
  }

  private renderTEG830DonationTable(element: Element, container: HTMLElement): void {
    const section = this.createElement('div', 'document-section');
    
    const sectionTitle = this.createElement('h3', 'document-subtitle');
    sectionTitle.textContent = '■ 寄付先一覧';
    section.appendChild(sectionTitle);
    
    // WML00000配下のWML00010要素を取得
    const wml00000 = element.querySelector('WML00000');
    if (!wml00000) return;
    
    const donations: Element[] = [];
    for (let i = 0; i < wml00000.children.length; i++) {
      const child = wml00000.children[i];
      if (this.getLocalTagName(child.tagName) === 'WML00010') {
        donations.push(child);
      }
    }
    
    if (donations.length === 0) return;
    
    // テーブル作成
    const table = this.createElement('table', 'document-table');
    
    // ヘッダー
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['No.', '受付番号', '寄付日', '寄付先自治体', '法人番号', '寄付金額'];
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // ボディ
    const tbody = document.createElement('tbody');
    donations.forEach((donation, index) => {
      const row = document.createElement('tr');
      
      // No.
      const noCell = document.createElement('td');
      noCell.textContent = (index + 1).toString();
      noCell.style.textAlign = 'center';
      row.appendChild(noCell);
      
      // 受付番号
      const receiptCell = document.createElement('td');
      receiptCell.textContent = this.getElementText(donation, 'WML00020');
      row.appendChild(receiptCell);
      
      // 寄付日
      const dateCell = document.createElement('td');
      const wml00030 = donation.querySelector('WML00030');
      if (wml00030) {
        const yyyy = this.getElementText(wml00030, 'yyyy');
        const mm = this.getElementText(wml00030, 'mm');
        const dd = this.getElementText(wml00030, 'dd');
        dateCell.textContent = `${yyyy}年${mm}月${dd}日`;
      }
      dateCell.style.whiteSpace = 'nowrap';
      row.appendChild(dateCell);
      
      // 寄付先自治体
      const cityCell = document.createElement('td');
      const wml00040 = donation.querySelector('WML00040');
      if (wml00040) {
        cityCell.textContent = this.getElementText(wml00040, 'WML00050');
      }
      row.appendChild(cityCell);
      
      // 法人番号
      const corpCell = document.createElement('td');
      if (wml00040) {
        corpCell.textContent = this.getElementText(wml00040, 'WML00060 hojinbango');
      }
      corpCell.style.fontSize = '0.85rem';
      row.appendChild(corpCell);
      
      // 寄付金額
      const amountCell = document.createElement('td');
      const amount = this.getElementText(donation, 'WML00070');
      amountCell.textContent = this.formatCurrency(amount);
      amountCell.style.textAlign = 'right';
      amountCell.style.fontWeight = 'bold';
      row.appendChild(amountCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    section.appendChild(table);
    container.appendChild(section);
  }

  private getElementText(element: Element, path: string): string {
    const parts = path.split(' ');
    let current: Element | null = element;
    
    for (const part of parts) {
      if (!current) return '';
      
      let found: Element | null = null;
      for (let i = 0; i < current.children.length; i++) {
        const child = current.children[i] as Element;
        const localName = this.getLocalTagName(child.tagName);
        if (localName === part) {
          found = child;
          break;
        }
      }
      
      if (!found) return '';
      current = found;
    }
    
    return current?.textContent?.trim() || '';
  }

  private getKubunName(code: string): string {
    const kubunMap: Record<string, string> = {
      '1': '給与所得者',
      '2': '公的年金等受給者',
      '3': 'その他'
    };
    return kubunMap[code] || code;
  }

  private formatCurrency(value: string): string {
    if (!value) return '';
    const num = parseInt(value, 10);
    if (isNaN(num)) return value;
    return `¥${num.toLocaleString()}`;
  }

  private renderGenericForm(element: Element, container: HTMLElement): void {
    // 汎用フォームレンダリング（既存のロジック）
    const title = this.createElement('h1', 'document-title');
    title.textContent = this.getDocumentTitle(element);
    container.appendChild(title);
    
    this.renderFormContent(element, container);
  }

  private getDocumentTitle(element: Element): string {
    // タイトルを推測
    const titleElements = ['title', 'name', 'documentName', 'heading'];
    for (const tagName of titleElements) {
      const titleElem = element.querySelector(tagName);
      if (titleElem && titleElem.textContent) {
        return titleElem.textContent.trim();
      }
    }
    return element.tagName;
  }

  private renderFormContent(element: Element, container: HTMLElement): void {
    // 直下の子要素をすべて展開して処理
    this.renderElementRecursively(element, container, 0);
  }

  private renderElementRecursively(element: Element, container: HTMLElement, depth: number): void {
    // 深すぎる場合は処理を停止
    if (depth > 10) return;
    
    const processedTags = new Set<string>();
    
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const tagName = this.getLocalTagName(child.tagName);
      
      if (processedTags.has(tagName)) continue;
      processedTags.add(tagName);
      
      // 同じタグ名の要素を収集
      const sameTagElements: Element[] = [];
      for (let j = 0; j < element.children.length; j++) {
        if (this.getLocalTagName(element.children[j].tagName) === tagName) {
          sameTagElements.push(element.children[j]);
        }
      }
      
      // 繰り返し要素の検出（2つ以上 & シンプルな構造）
      if (sameTagElements.length >= 2 && this.isTableCandidate(sameTagElements)) {
        this.renderAsTable(sameTagElements, container, tagName);
      } else if (sameTagElements.length === 1) {
        const elem = sameTagElements[0];
        
        // 子要素内に繰り返しパターンがあるかチェック
        const hasRepeatingChildren = this.hasRepeatingChildren(elem);
        
        if (hasRepeatingChildren) {
          // コンテナ要素として扱い、子要素を再帰的に処理
          this.renderElementRecursively(elem, container, depth + 1);
        } else if (elem.children.length > 0) {
          // セクションとして表示
          this.renderAsSection(elem, container);
        }
      }
    }
  }

  private getLocalTagName(tagName: string): string {
    // 名前空間プレフィックスを除去（例: "gen:era" -> "era"）
    const parts = tagName.split(':');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  private hasRepeatingChildren(element: Element): boolean {
    const childTags = new Map<string, number>();
    
    for (let i = 0; i < element.children.length; i++) {
      const tagName = this.getLocalTagName(element.children[i].tagName);
      childTags.set(tagName, (childTags.get(tagName) || 0) + 1);
    }
    
    // 2つ以上同じタグ名の子要素があればtrue
    for (const count of childTags.values()) {
      if (count >= 2) return true;
    }
    
    return false;
  }

  private isTableCandidate(elements: Element[]): boolean {
    if (elements.length < 2) return false;
    
    // すべての要素が同じような構造を持っているかチェック
    const firstElem = elements[0];
    const firstChildCount = firstElem.children.length;
    
    // 子要素が0個または1個だけなら不適
    if (firstChildCount <= 1) return false;
    
    // すべての要素が似た数の子要素を持っているか
    for (const elem of elements) {
      const childCount = elem.children.length;
      if (Math.abs(childCount - firstChildCount) > 2) {
        return false;
      }
    }
    
    return true;
  }

  private hasSimpleStructure(element: Element): boolean {
    // 複雑な入れ子構造がない場合はtrue
    for (let i = 0; i < element.children.length; i++) {
      if (element.children[i].children.length > 0) {
        return false;
      }
    }
    return element.children.length > 0;
  }

  private renderAsTable(elements: Element[], container: HTMLElement, sectionName: string): void {
    const section = this.createElement('div', 'document-section');
    
    // セクションタイトル
    const sectionTitle = this.createElement('h3', 'document-subtitle');
    sectionTitle.textContent = this.formatLabel(sectionName) + ` (${elements.length}件)`;
    section.appendChild(sectionTitle);
    
    // テーブル作成
    const table = this.createElement('table', 'document-table');
    
    // ヘッダー
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 行番号
    const rowNumHeader = document.createElement('th');
    rowNumHeader.textContent = 'No.';
    rowNumHeader.style.width = '50px';
    headerRow.appendChild(rowNumHeader);
    
    // 列名を収集（名前空間を考慮）
    const columns = new Set<string>();
    const columnOriginalNames = new Map<string, string>();
    
    elements.forEach(elem => {
      // 属性
      for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes[i];
        const localName = this.getLocalTagName(attr.name);
        columns.add(`@${localName}`);
        columnOriginalNames.set(`@${localName}`, attr.name);
      }
      // 子要素（全階層を展開）
      this.collectAllLeafNodes(elem, columns, columnOriginalNames, '');
    });
    
    const columnArray = Array.from(columns);
    columnArray.forEach(col => {
      const th = document.createElement('th');
      th.textContent = this.formatLabel(col);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // ボディ
    const tbody = document.createElement('tbody');
    elements.forEach((elem, index) => {
      const row = document.createElement('tr');
      
      // 行番号
      const rowNumCell = document.createElement('td');
      rowNumCell.textContent = (index + 1).toString();
      rowNumCell.style.textAlign = 'center';
      rowNumCell.style.background = '#f8fafc';
      row.appendChild(rowNumCell);
      
      columnArray.forEach(col => {
        const td = document.createElement('td');
        
        if (col.startsWith('@')) {
          const attrName = columnOriginalNames.get(col) || col.substring(1);
          td.textContent = elem.getAttribute(attrName) || '';
        } else {
          const value = this.getLeafNodeValue(elem, col);
          td.textContent = value;
        }
        
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    section.appendChild(table);
    container.appendChild(section);
  }

  private collectAllLeafNodes(element: Element, columns: Set<string>, originalNames: Map<string, string>, prefix: string): void {
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const localName = this.getLocalTagName(child.tagName);
      const fullPath = prefix ? `${prefix}.${localName}` : localName;
      
      if (child.children.length === 0) {
        // リーフノード
        columns.add(fullPath);
        originalNames.set(fullPath, child.tagName);
      } else {
        // さらに深く探索
        this.collectAllLeafNodes(child, columns, originalNames, fullPath);
      }
    }
  }

  private getLeafNodeValue(element: Element, path: string): string {
    const parts = path.split('.');
    let current: Element | null = element;
    
    for (const part of parts) {
      if (!current) return '';
      
      let found = false;
      for (let i = 0; i < current.children.length; i++) {
        const child: Element = current.children[i] as Element;
        if (this.getLocalTagName(child.tagName) === part) {
          current = child;
          found = true;
          break;
        }
      }
      
      if (!found) return '';
    }
    
    return current?.textContent?.trim() || '';
  }

  private renderAsSection(element: Element, container: HTMLElement): void {
    const section = this.createElement('div', 'document-section');
    
    // セクションタイトル
    if (element.tagName && element.children.length > 0) {
      const sectionTitle = this.createElement('h3', 'document-subtitle');
      const localName = this.getLocalTagName(element.tagName);
      sectionTitle.textContent = this.formatLabel(localName);
      section.appendChild(sectionTitle);
    }
    
    // 属性を表示
    if (element.attributes.length > 0) {
      const attrDiv = this.createElement('div', '');
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const localName = this.getLocalTagName(attr.name);
        const field = this.createElement('span', 'document-field');
        field.innerHTML = `
          <span class="document-field-label">${this.formatLabel(localName)}:</span>
          <span class="document-field-value">${attr.value}</span>
        `;
        attrDiv.appendChild(field);
      }
      section.appendChild(attrDiv);
    }
    
    // 全子要素を展開してフィールドとして表示
    const allFields = this.extractAllFields(element);
    
    if (allFields.length > 0) {
      const grid = this.createElement('div', 'form-grid');
      
      allFields.forEach(field => {
        const gridItem = this.createElement('div', 'form-grid-item');
        gridItem.innerHTML = `
          <div class="form-grid-item-label">${this.formatLabel(field.path)}</div>
          <div class="form-grid-item-value">${field.value}</div>
        `;
        grid.appendChild(gridItem);
      });
      
      section.appendChild(grid);
    } else if (element.textContent?.trim()) {
      // テキストコンテンツのみの場合
      const textDiv = this.createElement('div', 'document-text');
      textDiv.textContent = element.textContent.trim();
      section.appendChild(textDiv);
    }
    
    if (section.children.length > 0) {
      container.appendChild(section);
    }
  }

  private extractAllFields(element: Element): Array<{path: string, value: string}> {
    const fields: Array<{path: string, value: string}> = [];
    
    const traverse = (elem: Element, prefix: string = '') => {
      for (let i = 0; i < elem.children.length; i++) {
        const child = elem.children[i];
        const localName = this.getLocalTagName(child.tagName);
        const fullPath = prefix ? `${prefix}.${localName}` : localName;
        
        if (child.children.length === 0) {
          // リーフノード
          const value = child.textContent?.trim() || '';
          if (value) {
            fields.push({ path: fullPath, value });
          }
        } else {
          // さらに探索
          traverse(child, fullPath);
        }
      }
    };
    
    traverse(element);
    return fields;
  }

  private formatLabel(text: string): string {
    // キャメルケースやスネークケースをスペース区切りに
    return text
      .replace(/@/g, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private createElement(tag: string, className: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    return element;
  }

  private async handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.currentXMLContent);
      this.showToast('クリップボードにコピーしました', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      this.showToast('コピーに失敗しました', 'error');
    }
  }

  private handleDownload(): void {
    if (!this.currentFile) return;

    const blob = new Blob([this.currentXMLContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('ファイルをダウンロードしました', 'success');
  }

  private handleClose(): void {
    this.viewerContainer.classList.add('hidden');
    this.dropZone.style.display = 'block';
    this.currentFile = null;
    this.currentXMLContent = '';
    this.currentXMLDoc = null;
    this.fileInput.value = '';
    this.xmlTree.innerHTML = '';
    this.xmlRaw.textContent = '';
    this.xmlTable.innerHTML = '';
    this.formContent.innerHTML = '';
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
  new XMLViewer();
});

