import * as markdata from './markdata';

let data1 : markdata.MarkData = {
    id : "1", // 唯一编号
    markType : markdata.MarkType.file,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "test1",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let data2 : markdata.MarkData = {
    id : "2", // 唯一编号
    markType : markdata.MarkType.file,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "test2",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let data3 : markdata.MarkData = {
    id : "3", // 唯一编号
    markType : markdata.MarkType.group,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "testGroup1",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let data4 : markdata.MarkData = {
    id : "4", // 唯一编号
    markType : markdata.MarkType.group,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "testGroup2",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let data5 : markdata.MarkData = {
    id : "6", // 唯一编号
    markType : markdata.MarkType.file,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "test2-1",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let data6 : markdata.MarkData = {
    id : "7", // 唯一编号
    markType : markdata.MarkType.file,
    filePath :"D:\soft\vs code\gymark\catmark\src\core\testdata.ts", 
    name : "test2-2",
    comment : "test1 xxxxxx", // 对该书签的详细描述
    line : 10,
};

let child1 = new markdata.MarkDataTreeNode(data1);
let child2 = new markdata.MarkDataTreeNode(data2);
let group1 = new markdata.MarkDataTreeNode(data4);
let child1_1 = new markdata.MarkDataTreeNode(data5);
let child1_2 = new markdata.MarkDataTreeNode(data6);
group1.addChild(child1_1);
group1.addChild(child1_2);

export let root = new markdata.MarkDataTreeNode(data3);
root.addChild(child1);
root.addChild(child2);
root.addChild(group1);

export let provider = new markdata.DepNodeProvider(root);