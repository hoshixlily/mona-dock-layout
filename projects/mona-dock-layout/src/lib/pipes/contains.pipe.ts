import { Pipe, PipeTransform } from "@angular/core";
import { all, contains } from "@mirei/ts-collections";

@Pipe({
    name: "monaContains",
    standalone: true
})
export class ContainsPipe implements PipeTransform {
    public transform<T>(sequence: Iterable<T> | null | undefined, value: T | Iterable<T>): boolean {
        if (sequence == null) {
            return false;
        }
        if (typeof value === "string") {
            return contains(sequence, value as any);
        }
        if (Symbol.iterator in Object(value)) {
            return all(value as Iterable<T>, item => contains(sequence, item));
        }
        return contains(sequence, value as T);
    }
}
