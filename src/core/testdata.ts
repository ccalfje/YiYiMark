import * as markdata from './markdata';

let testFileStr =  "D:\soft\vs code\gymark\catmark\src\core\testdata.ts";
let child1 = markdata.createFileMarkData("testFile1", "this is test file1", testFileStr, 10);
let child2 = markdata.createFileMarkData("testFile2", "this is test file2", testFileStr, 10);
let group1 = markdata.createGroupMarkData("testGroup1");
let child11 = markdata.createFileMarkData("testChild1_1", "this is test testChild1_1", testFileStr, 10);
let child12 = markdata.createFileMarkData("testChild2_2", "this is test testChild2_2", testFileStr, 10);

group1.addChild(child11);
group1.addChild(child12);

export let root = new markdata.MarkData;
root.addChild(child1);
root.addChild(child2);
root.addChild(group1);

export let provider = new markdata.MarkDataProvider(root);