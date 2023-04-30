import * as fzf from 'fzf';
import * as markdata from './markdata';
import * as vscode from 'vscode';

export interface MarkDataPickItem extends vscode.QuickPickItem {
    markdata: markdata.MarkData
}

export class FzfSearch {
    constructor(selectItemCallBack: (e: vscode.QuickPickItem) => any) {
        this.quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
        this.setOnAccept(selectItemCallBack);
        // 根据fzf搜索结果，动态更新候选项
        let searchFun = async (str: string) => {
            this.setCurrentSearchStr(str);
            if (str !== '') {
                await this.searchCLi(str);
            } else {
                this.restoreItems();
            }
        };
        this.setOnDidChangeValue(searchFun);
    }

    show() {
        this.quickPick.show();
    }

    close() {
        this.quickPick.dispose();
    }

    updateItems(items: vscode.QuickPickItem[]) {
        this.quickPick.items = items;
    }

    restoreItems() {
        this.updateItems(this.iniQuickItems);
    }

    clear() {
        this.quickPick.items = [];
    }

    setOnDidChangeValue(listener: (e: string) => any, thisArgs?: any) {
        this.quickPick.onDidChangeValue(listener, thisArgs);
    }

    setOnAccept(selectItemCallBack: (e: vscode.QuickPickItem) => any) {
        let afterAcceptFun = () => {
            let selectItems = this.quickPick.selectedItems;
            if (selectItems.length !== 0) {
                selectItemCallBack(selectItems[0]);
            }

        };
        this.quickPick.onDidAccept(afterAcceptFun, this);
    }

    setCurrentSearchStr(str: string) {
        this.curretnStr = str;
    }

    getCurrentSearchStr() {
        return this.curretnStr;
    }

    async searchCLi(str: string) {
        // 合并两组搜索结果
        let combFunc = function (res1: fzf.FzfResultItem<markdata.MarkData>[], res2: fzf.FzfResultItem<markdata.MarkData>[]) {
            if (res1.length === 0) {
                return res2;
            } else if (res2.length === 0) {
                return res1;
            }
            let i = 0, j = 0, k = 0;
            let res = [];
            while (!(i >= res1.length && j >= res2.length) && k < 32) {
                if (i >= res1.length) {
                    res.push(res2[j]);
                    ++j;
                } else if (j >= res2.length) {
                    res.push(res1[i]);
                    ++i;
                } else if (res1[i].score > res2[j].score) {
                    res.push(res1[i]);
                    ++i;
                } else {
                    res.push(res2[j]);
                    ++j;
                }
                ++k;
            }
            return res;
        };

        let updateFunc = (results: fzf.FzfResultItem<markdata.MarkData>[]) => {
            let quickItems = results.map((row: fzf.FzfResultItem<markdata.MarkData>) => {
                return {
                    label: row.item.getName(),
                    description: row.item.getFilePath(),
                    alwaysShow: true,
                    markdata: row.item
                } as MarkDataPickItem;
            });
            this.updateItems(quickItems);
        };

        let res0 = [] as fzf.FzfResultItem<markdata.MarkData>[];
        for (let i = 0; i < this.fzfGetListSize(); ++i) {
            if (this.getCurrentSearchStr() === '') {
                this.restoreItems();
                break;
            } else if (str === this.getCurrentSearchStr()) {
                // 持续更新
                let res = await this.fzfOneFindAsync(str, i);
                res0 = combFunc(res0, res);
                updateFunc(res0);
            } else {
                // 搜索条件发生变化，提前返回结果
                console.log("搜索条件发生变化，提前返回结果");
                updateFunc(res0);
                break;
            }
        }
    }

    fzfInit(data: markdata.MarkData[], groupNum: number = 1000) {
        if (groupNum <= 1) {
            console.log("[yiyiMark] fzf:", "invalid groupNum");
            return;
        }

        this.fzfList.length = 0;

        if (data.length <= groupNum) {
            let opt = {
                limit: 32,
                selector: (item: markdata.MarkData) => item.getName(),
                tiebreakers: [fzf.byLengthAsc]
            };

            let f = new fzf.Fzf(data, opt);

            this.fzfList.push(f);
            return;
        }

        let count = Math.floor(groupNum / 1000) + 1;
        let currentSize = 0;
        for (let i = 0; i < count; ++i) {
            let resSize = data.length - currentSize;
            let arr = data.slice(currentSize, resSize >= 1000 ? 1000 : resSize);
            let f = new fzf.Fzf(arr, {
                limit: 32,
                selector: (item: markdata.MarkData) => item.getName(),
                tiebreakers: [fzf.byLengthAsc]
            });
            this.fzfList.push(f);
            currentSize += 1000;
        }
    }

    fzfGetListSize() {
        return this.fzfList.length;
    }

    fzfOneFindAsync(str: string, fzfIndex: number) {
        let pro = new Promise<fzf.FzfResultItem<markdata.MarkData>[]>((resolve, reject) => {
            let func = () => {
                let res = this.fzfList[fzfIndex].find(str);
                resolve(res);
            };
            setTimeout(func, 0);
        });
        return pro;
    }

    getSearchResFormUI(initNodes: readonly markdata.MarkData[] | undefined) {
        this.quickPick.value = "";
        this.iniQuickItems = [];
        // 初始化候选项
        if (initNodes && initNodes.length !== 0) {
            let quickItems = [];
            for (let i = 0; i < initNodes.length && i < 15; i++) {
                quickItems.push({
                    label: initNodes[i].getName(),
                    description: initNodes[i].getFilePath(),
                    alwaysShow: true,
                    markdata: initNodes[i]
                });
            }
            this.updateItems(quickItems);
            this.iniQuickItems = quickItems;
        }
        this.show();
    }

    iniQuickItems: vscode.QuickPickItem[] = [];

    curretnStr: string = "";

    quickPick: vscode.QuickPick<vscode.QuickPickItem>;

    fzfList: Array<fzf.Fzf<Array<markdata.MarkData>>> = [];

}