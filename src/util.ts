import * as _ from 'lodash';

export class Util {

    static getRepeatCount(array: string[]): number {
        // console.log('repeatstart', new Date().getTime())

        // let result=0;
        // for(let i = 0; i<str.length-1;i++){
        //     for(let j = i+1; j<=str.length-1;j++){
        //         if(str[i]==str[j]){
        //             result++;
        //             break;
        //         }
        //     }
        // }
        // return result;
        // var _array = [array[0]];
        // for (var i = 1; i < array.length; i++) {
        //     if (array.indexOf(array[i]) == i) _array.push(array[i]);
        // }
        // var a = new Set(array);
        // var _array = Array.from(a);

        const _array = _.uniq(array);
        // console.log('repeatend', new Date().getTime())
        return array.length - _array.length;
    }
    static removeSomeChar(str: string){
      return str.replace('+', '').replace(';', '').replace(',', '');
    }
    static getDimensions(id: string) {
        const el = document.getElementById(id);
        let w = 0,
            h = 0;
        if (el) {
            const dimensions = (<any>el).getBBox();
            w = dimensions.width;
            h = dimensions.height;
        } else {
            console.log('error: getDimensions() ' + id + ' not found.');
        }
        return {
            w: w,
            h: h
        };
    }
}