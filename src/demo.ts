import * as Sankey from "sankey-multilevel";
import * as _ from "lodash";

export class Demo {
  constructor(private div: HTMLDivElement) {

  }
  private getDemoData() {
    let data: Sankey.SankeyData = {
      columns: [
        [
          { id: "a", label: "a", value: 100, tips: ['a:100'], color: '' },
          { id: "2a", label: "2a", value: 100, tips: ['2a:100'], color: '' },
          { id: "3a", label: "3a", value: 100, tips: ['3a:100'], color: '' }
        ],
        [
          { id: "b", label: "b", value: 100, tips: ['b:100'], color: '' },
          { id: "2b", label: "2b", value: 100, tips: ['2b:100'], color: '' },
          { id: "3b", label: "3b", value: 100, tips: ['3b:100'], color: '' },
          { id: "4b", label: "3b", value: 100, tips: ['4b:100'], color: '' },
        ],
        [
          { id: "c", label: "c", value: 100, tips: ['c:100'], color: '' },
          { id: "2c", label: "2c", value: 100, tips: ['2c:100'], color: '' },
          { id: "3c", label: "3c", value: 100, tips: ['3c:100'], color: '' },
          { id: "4c", label: "4c", value: 100, tips: ['4c:100'], color: '' },
          { id: "5c", label: "5c", value: 100, tips: ['5c:100'], color: '' }
        ],
        [
          { id: "d", label: "d", value: 100, tips: ['d:100'], color: '' },
          { id: "2d", label: "2d", value: 100, tips: ['2d:100'], color: '' },
          { id: "3d", label: "3d", value: 100, tips: ['3d:100'], color: '' }
        ],
        [
          { id: "e", label: "e", value: 100, tips: ['e:100'], color: '' },
          { id: "2e", label: "2e", value: 100, tips: ['2e:100'], color: '' }
        ]
      ],
      links: [
        // { sourceChain: ["a", "b", "c", "d", "e"], source: "d", target: "e", value: 12 }
      ]
    }
    data.links = this.getLinks(data.columns);
    return data;
  }

  private getLinks(columns: Sankey.Node[][]) {
    let links: Sankey.Link[] = [];
    // let link: Sankey.Link = {
    //   sourceChain: [],
    //   source: '',
    //   target: '',
    //   value: 0,
    //   inpatIds: []
    // }
    this.go(columns, links, 0);
    console.log('count', this.count);
    console.log('links', links);

    return links;
  }
  private count = 0;
  private go(columns: Sankey.Node[][], links: Sankey.Link[], colIndex: number, linkPath: Sankey.Link = null) {
    for (var i = 0; i <= columns[colIndex].length - 1; i++) {
      let link: Sankey.Link = null;
      link = {
        sourceChain: [],
        source: '',
        target: '',
        value: 0,
        inpatIds: []
      }
      if (linkPath) {
        // link = _.cloneDeep(linkPath);
        link = JSON.parse(JSON.stringify(linkPath));
        while (link.sourceChain.length > colIndex) {
          link.sourceChain.pop();
        }
      } else {
        // console.log( "no copy new", 'row: ' + i, 'column: ' + colIndex);
      }

      link.sourceChain.push(columns[colIndex][i].id);

      if (colIndex === columns.length - 1) {
        link.source = link.sourceChain[link.sourceChain.length - 2];
        link.target = link.sourceChain[link.sourceChain.length - 1];
        link.value = 10;
        // links.push(_.cloneDeep(link));
        links.push(JSON.parse(JSON.stringify(link)));
        console.log('row: ' + i, 'column: ' + colIndex);
        console.log('link: ', link.sourceChain);

        link = null;
        link = {
          sourceChain: [],
          source: '',
          target: '',
          value: 0,
          inpatIds: []
        }
        this.count++;
      } else {
        this.go(columns, links, colIndex + 1, link);
      }
    }
  }
  showDemoSankey() {
    let data = this.getDemoData();
    const sankeyOptions: Sankey.SankeyOptions = {
      parentEle: this.div,
      data: data,
      sankeyConfig: {
        nodeWidth: 20,
        nodePadding: 20,
        curvature: 0.2,
        hasShiftFunc: true,
        hasCtrlFunc: true,
      },
      // nodeTooltipFormatter: (targetId, targetValue, targetNode, primaryNodes) => {
      //   let result = '';
      //   targetNode.tips.forEach((line, index) => {

      //     if (index == targetNode.tips.length - 1) {
      //       result = result + line;
      //     } else {
      //       result = result + line + '<br/>';
      //     }
      //   })
      //   return result;
      // }
    }
    let sankeyInstance = Sankey.initSankey(sankeyOptions);
    sankeyInstance.draw();
  }
}
